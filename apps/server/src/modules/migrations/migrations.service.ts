import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { type Connection, Model } from 'mongoose';

import { type Migration } from './migration.types.js';
import { MigrationRecord } from './migration-record.schema.js';

/**
 * Loads migration files from `<repo-root>/apps/server/migrations/`,
 * compares them against applied records in `_migrations`, and runs
 * `up()` / `down()` as needed.
 */
@Injectable()
export class MigrationsService {
  private readonly logger = new Logger(MigrationsService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MigrationRecord.name)
    private readonly migrationModel: Model<MigrationRecord>,
  ) {}

  /** Absolute path to the directory containing compiled migration files. */
  private get migrationsDir(): string {
    // __dirname is unavailable in ESM; derive from import.meta.url.
    const here = fileURLToPath(import.meta.url);
    // Compiled service lives at dist/modules/migrations/migrations.service.js.
    // Migration files compile to dist/migrations/ via tsconfig.migrations.json.
    return path.resolve(path.dirname(here), '..', '..', 'migrations');
  }

  /** Loads and returns all migrations sorted by version ascending. */
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
      // Use dynamic import so compiled JS and ts-node both work.
      const mod = (await import(pathToFileURL(filePath).href)) as { default: Migration };
      migrations.push(mod.default);
    }

    return migrations.sort((a, b) => a.version - b.version);
  }

  /** Returns the set of versions already recorded in `_migrations`. */
  async appliedVersions(): Promise<Set<number>> {
    const records = await this.migrationModel.find({}, { version: 1 }).lean();
    return new Set(records.map((r) => r.version));
  }

  /** Applies all pending migrations in ascending order. */
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

  /** Rolls back the most recently applied migration. */
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

  /** Prints a status table of applied/pending migrations. */
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
