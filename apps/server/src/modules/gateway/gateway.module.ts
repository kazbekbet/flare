import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module.js';
import { ConversationsModule } from '../conversations/conversations.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { Conversation, ConversationSchema } from '../mongoose/schemas/conversation.schema.js';
import { Presence, PresenceSchema } from '../mongoose/schemas/presence.schema.js';
import { ChatGateway } from './chat.gateway.js';
import { GatewayEventsBridge } from './gateway-events.bridge.js';

/**
 * Модуль WebSocket Gateway.
 * Импортирует `AuthModule` для доступа к `JwtModule` в `WsJwtGuard`,
 * `ConversationsModule` и `MessagesModule` для работы с переписками и сообщениями.
 * Регистрирует Mongoose-модели `Presence` и `Conversation` для прямого доступа из gateway.
 */
@Module({
  imports: [
    AuthModule,
    ConversationsModule,
    MessagesModule,
    MongooseModule.forFeature([
      { name: Presence.name, schema: PresenceSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
  ],
  providers: [ChatGateway, GatewayEventsBridge],
  exports: [ChatGateway],
})
export class GatewayModule {}
