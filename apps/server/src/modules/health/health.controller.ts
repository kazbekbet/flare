import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import type { Connection } from 'mongoose';

/**
 * Healthcheck-эндпоинт.
 * В Phase 1 — простая проверка статуса Mongo-подключения.
 * Расширяется в Phase 4 (полноценный health с логированием duration).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Проверка живости сервера и подключения к Mongo' })
  check(): { status: string; mongo: string; uptime: number } {
    // Mongoose connection readyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const mongoState = this.connection.readyState === 1 ? 'connected' : 'disconnected';
    return { status: 'ok', mongo: mongoState, uptime: process.uptime() };
  }
}
