import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ConversationsModule } from '../conversations/conversations.module.js';
import { Conversation, ConversationSchema } from '../mongoose/schemas/conversation.schema.js';
import { Message, MessageSchema } from '../mongoose/schemas/message.schema.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

/**
 * Модуль сообщений.
 * Регистрирует схемы Message и Conversation, импортирует ConversationsModule
 * для проверки членства в переписке. Экспортирует MessagesService.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    ConversationsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
