import { Module } from '@nestjs/common';

import { HealthController } from './health.controller.js';

/**
 * Модуль healthcheck-эндпоинта.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
