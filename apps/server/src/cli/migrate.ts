/**
 * Автономный CLI для запуска Mongoose-миграций.
 *
 * Использование (после сборки):
 *   node dist/cli/migrate.js up      # применить ожидающие миграции
 *   node dist/cli/migrate.js down    # откатить последнюю миграцию
 *   node dist/cli/migrate.js status  # показать статус миграций
 *
 * Через скрипты пакета:
 *   pnpm --filter @flare/server migrate:up
 *   pnpm --filter @flare/server migrate:down
 *   pnpm --filter @flare/server migrate:status
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { MigrationsService } from '../modules/migrations/migrations.service.js';

import 'reflect-metadata';

type Command = 'up' | 'down' | 'status';

async function printStatus(service: MigrationsService): Promise<void> {
  const rows = await service.status();
  if (rows.length === 0) {
    console.log('No migrations found.');
    return;
  }
  console.log('\nMigration status:\n');
  for (const row of rows) {
    const applied = row.appliedAt ? `  (applied ${row.appliedAt.toISOString()})` : '';
    console.log(`  [${row.status === 'applied' ? 'x' : ' '}] v${row.version} — ${row.name}${applied}`);
  }
  console.log();
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || !['up', 'down', 'status'].includes(command)) {
    console.error('Usage: migrate <up|down|status>');
    process.exit(1);
  }

  // Инициализируем минимальный контекст приложения (без HTTP-сервера).
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const service = app.get(MigrationsService);

  const handlers: Record<Command, () => Promise<void>> = {
    up: () => service.migrateUp(),
    down: () => service.migrateDown(),
    status: () => printStatus(service),
  };

  try {
    await handlers[command as Command]();
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
