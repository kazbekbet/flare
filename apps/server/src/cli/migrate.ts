/**
 * Standalone CLI for running Mongoose migrations.
 *
 * Usage (after build):
 *   node dist/cli/migrate.js up      # apply pending migrations
 *   node dist/cli/migrate.js down    # roll back last migration
 *   node dist/cli/migrate.js status  # show applied/pending
 *
 * Via package scripts:
 *   pnpm --filter @flare/server migrate:up
 *   pnpm --filter @flare/server migrate:down
 *   pnpm --filter @flare/server migrate:status
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module.js';
import { MigrationsService } from '../modules/migrations/migrations.service.js';

import 'reflect-metadata';

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || !['up', 'down', 'status'].includes(command)) {
    console.error('Usage: migrate <up|down|status>');
    process.exit(1);
  }

  // Bootstrap a minimal application context (no HTTP server).
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const service = app.get(MigrationsService);

  try {
    if (command === 'up') {
      await service.migrateUp();
    } else if (command === 'down') {
      await service.migrateDown();
    } else {
      const rows = await service.status();
      if (rows.length === 0) {
        console.log('No migrations found.');
      } else {
        console.log('\nMigration status:\n');
        for (const row of rows) {
          const applied = row.appliedAt ? `  (applied ${row.appliedAt.toISOString()})` : '';
          console.log(`  [${row.status === 'applied' ? 'x' : ' '}] v${row.version} — ${row.name}${applied}`);
        }
        console.log();
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
