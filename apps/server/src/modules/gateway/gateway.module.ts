import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ChatGateway } from './chat.gateway.js';
import { GatewayEventsBridge } from './gateway-events.bridge.js';

/**
 * Модуль WebSocket Gateway.
 * Импортирует `AuthModule` для доступа к `JwtModule` в `WsJwtGuard`.
 * `GatewayEventsBridge` subscribes to EventBus (global) and forwards events to sockets.
 */
@Module({
  imports: [AuthModule],
  providers: [ChatGateway, GatewayEventsBridge],
  exports: [ChatGateway],
})
export class GatewayModule {}
