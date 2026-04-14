import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Conversation, ConversationSchema } from '../mongoose/schemas/conversation.schema.js';
import { ConversationsService } from './conversations.service.js';

/**
 * Модуль переписок.
 * Экспортирует `ConversationsService` — используется Friends-модулем
 * для автосоздания DIRECT-диалога при принятии запроса.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }])],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
