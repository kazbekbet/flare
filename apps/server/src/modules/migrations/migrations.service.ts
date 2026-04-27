import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Connection, Model } from 'mongoose';

import { type Migration } from './migration.types.js';
import { MigrationRecord } from './migration-record.schema.js';

/**
 * Загружает файлы миграций из `<repo-root>/apps/server/migrations/`,
 * сравнивает их с применёнными записями в `_migrations` и запускает
 * `up()` / `down()` по необходимости.
 */
@Injectable()
export class MigrationsService {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MigrationRecord.name)
    private readonly migrationModel: Model<MigrationRecord>,
  ) {}

  /** Абсолютный путь к директории скомпилированных файлов миграций. */
  private get migrationsDir(): string {
    // __dirname недоступен в ESM; получаем путь из import.meta.url.
    const here = fileURLToPath(import.meta.url);
    // Скомпилированный сервис находится в dist/modules/migrations/migrations.service.js.
    // Файлы миграций компилируются в dist/migrations/ через tsconfig.migrations.json.
    return path.resolve(path.dirname(here), '..', '..', 'migrations');
  }

  /** Загружает и возвращает все миграции, отсортированные по версии по возрастанию. */
  async loadMigrations(): Promise<Migration[]> {
    const dir = this.migrationsDir;

    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.js') || f.endsWith('.ts'))
      .sort();

    const migrations: Migration[] = [];
    for (const file of files) {
      const filePath = path.join(dir, file);
      // Используем динамический import — работает как с компилированным JS, так и с ts-node.
      const mod = (await import(pathToFileURL(filePath).href)) as { default: Migration };
      migrations.push(mod.default);
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  /** Возвращает множество версий, уже записанных в `_migrations`. */
  async appliedVersions(): Promise<Set<number>> {
    const records = await this.migrationModel.find({}, { version: 1 }).lean();
    return new Set(records.map((r) => r.version));
  }

  /** Применяет все ожидающие миграции в порядке возрастания версий. */
  async migrateUp(): Promise<void> {
    const migrations = await this.loadMigrations();
    const applied = await this.appliedVersions();

    const pending = migrations.filter((m) => !applied.has(m.version));
    if (pending.length === 0) {
      this.logger.log('No pending migrations.');
      return;
    }

    for (const migration of pending) {
      this.logger.log(`Applying migration ${migration.version}: ${migration.name}`);
      await migration.up(this.connection);
      await this.migrationModel.create({
        version: migration.version,
        name: migration.name,
        appliedAt: new Date(),
      });
      this.logger.log(`Migration ${migration.version} applied.`);
    }
  }

  /** Откатывает последнюю применённую миграцию. */
  async migrateDown(): Promise<void> {
    const records = await this.migrationModel.find().sort({ version: -1 }).limit(1).lean();
    if (records.length === 0) {
      this.logger.log('No applied migrations to roll back.');
      return;
    }

    const last = records[0];
    const migrations = await this.loadMigrations();
    const migration = migrations.find((m) => m.version === last.version);

    if (!migration) {
      throw new Error(`Migration file for version ${last.version} not found; cannot roll back.`);
    }

    this.logger.log(`Rolling back migration ${migration.version}: ${migration.name}`);
    await migration.down(this.connection);
    await this.migrationModel.deleteOne({ version: migration.version });
    this.logger.log(`Migration ${migration.version} rolled back.`);
  }

  /** Возвращает таблицу статусов применённых и ожидающих миграций. */
  async status(): Promise<Array<{ version: number; name: string; status: 'applied' | 'pending'; appliedAt?: Date }>> {
    const migrations = await this.loadMigrations();
    const applied = await this.appliedVersions();
    const records = await this.migrationModel.find().lean();
    const recordMap = new Map(records.map((r) => [r.version, r.appliedAt]));

    return migrations.map((m) => ({
      version: m.version,
      name: m.name,
      status: applied.has(m.version) ? 'applied' : 'pending',
      appliedAt: recordMap.get(m.version),
    }));
  }
}
