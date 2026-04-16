import { Module, type OnApplicationBootstrap } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MigrationRecord, MigrationRecordSchema } from './migration-record.schema.js';
import { MigrationsService } from './migrations.service.js';

/**
 * Provides the migration runner as a NestJS module.
 * Auto-apply on startup is opt-in: set RUN_MIGRATIONS_ON_BOOT=true.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: MigrationRecord.name, schema: MigrationRecordSchema }])],
  providers: [MigrationsService],
  exports: [MigrationsService],
})
export class MigrationsModule implements OnApplicationBootstrap {
  constructor(private readonly migrationsService: MigrationsService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env['RUN_MIGRATIONS_ON_BOOT'] !== 'true') {
      return;
    }
    await this.migrationsService.migrateUp();
  }
}
