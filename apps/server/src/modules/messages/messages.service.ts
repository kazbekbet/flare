import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Connection, Model, Types } from 'mongoose';

import type { SendMessageDto } from '@flare/shared';

import { Conversation, type ConversationDocument } from '../mongoose/schemas/conversation.schema.js';
import { Message, type MessageDocument } from '../mongoose/schemas/message.schema.js';

/**
 * Сервис работы с сообщениями.
 * Отвечает за создание сообщений, cursor-пагинацию и обновление статусов доставки/прочтения.
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Создаёт сообщение и обновляет денормализованное поле `lastMessage` в переписке.
   * Оба действия выполняются в транзакции.
   *
   * @param dto - Данные сообщения из клиента.
   * @param senderId - ID отправителя.
   * @param conversationId - ID переписки.
   * @returns Созданный документ сообщения.
   */
  async create(dto: SendMessageDto & { senderId: string; conversationId: string }): Promise<MessageDocument> {
    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const [message] = await this.messageModel.create(
        [
          {
            conversationId: new Types.ObjectId(dto.conversationId),
            senderId: new Types.ObjectId(dto.senderId),
            encryptedContent: dto.encryptedContent,
            nonce: dto.nonce,
            type: dto.type,
            media: dto.media,
          },
        ],
        { session },
      );

      await this.conversationModel.updateOne(
        { _id: new Types.ObjectId(dto.conversationId) },
        {
          $set: {
            lastMessage: {
              encryptedContent: dto.encryptedContent,
              senderId: dto.senderId,
              createdAt: new Date(),
            },
          },
        },
        { session },
      );

      await session.commitTransaction();

      return message;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Возвращает сообщения переписки с cursor-пагинацией.
   * Курсор — `_id` последнего загруженного сообщения (ObjectId содержит timestamp).
   *
   * @param conversationId - ID переписки.
   * @param cursor - ID сообщения для загрузки более старых записей.
   * @param limit - Количество сообщений на страницу (по умолчанию 50).
   * @returns Массив документов сообщений.
   */
  async findByConversation(conversationId: string, cursor?: string, limit = 50): Promise<MessageDocument[]> {
    const filter: Record<string, unknown> = {
      conversationId: new Types.ObjectId(conversationId),
    };

    if (cursor) {
      filter._id = { $lt: new Types.ObjectId(cursor) };
    }

    return this.messageModel.find(filter).sort({ _id: -1 }).limit(limit).lean();
  }

  /**
   * Проставляет `deliveredAt` для указанных сообщений, если они ещё не доставлены
   * и отправлены не текущим пользователем.
   *
   * @param messageIds - Массив ID сообщений.
   * @param userId - ID получателя (текущий пользователь).
   * @returns Промис, разрешающийся после обновления.
   */
  async markDelivered(messageIds: string[], userId: string): Promise<void> {
    const objectIds = messageIds.map((id) => new Types.ObjectId(id));

    await this.messageModel.updateMany(
      {
        _id: { $in: objectIds },
        senderId: { $ne: new Types.ObjectId(userId) },
        deliveredAt: null,
      },
      { $set: { deliveredAt: new Date() } },
    );
  }

  /**
   * Помечает все непрочитанные сообщения в переписке как прочитанные
   * (кроме сообщений текущего пользователя).
   *
   * @param conversationId - ID переписки.
   * @param userId - ID получателя (текущий пользователь).
   * @returns Промис, разрешающийся после обновления.
   */
  async markRead(conversationId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(userId) },
        readAt: null,
      },
      { $set: { readAt: new Date() } },
    );
  }

  /**
   * Возвращает уникальные ID отправителей для указанных сообщений.
   * Используется gateway для уведомления отправителей о доставке.
   *
   * @param messageIds - Массив ID сообщений.
   * @returns Массив уникальных ID отправителей.
   */
  async getSenderIds(messageIds: string[]): Promise<string[]> {
    const objectIds = messageIds.map((id) => new Types.ObjectId(id));

    const messages = await this.messageModel.find({ _id: { $in: objectIds } }, { senderId: 1 }).lean();

    const uniqueIds = new Set(messages.map((m) => String(m.senderId)));

    return [...uniqueIds];
  }
}
