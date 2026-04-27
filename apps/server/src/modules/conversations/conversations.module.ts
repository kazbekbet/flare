import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Conversation, ConversationSchema } from '../mongoose/schemas/conversation.schema.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';

/**
 * Модуль переписок.
 * Экспортирует `ConversationsService` — используется Friends-модулем и Messages-модулем.
 * Контроллер отдаёт список переписок текущего пользователя.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema }])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
