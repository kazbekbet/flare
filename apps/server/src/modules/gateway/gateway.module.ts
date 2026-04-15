import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ChatGateway } from './chat.gateway.js';

/**
 * Модуль WebSocket Gateway.
 * Импортирует `AuthModule` для доступа к `JwtModule` в `WsJwtGuard`.
 * Экспортирует `ChatGateway` — его используют другие модули, чтобы отправлять события.
 */
@Module({
  imports: [AuthModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class GatewayModule {}
