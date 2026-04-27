import { ConflictException, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { type ClientSession, type Connection, Model, Types } from 'mongoose';

import { ConversationType } from '@flare/shared';

import { Conversation, type ConversationDocument } from '../mongoose/schemas/conversation.schema.js';

/**
 * Сервис работы с переписками.
 * В Phase 1 отвечает за создание `DIRECT`-диалога при принятии запроса дружбы.
 * Запросы на listing/messages добавляются в Phase 2.
 */
@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * Создаёт `DIRECT`-диалог между двумя пользователями, если его ещё нет.
   * Выполняется внутри транзакции — гарантирует атомарность с другими записями
   * (например, обновлением статуса Friendship).
   *
   * @param memberIds - Пара ID участников.
   * @param session - Активная сессия транзакции (обязательно, вызывается из Friends-модуля).
   * @returns ID существующего или нового диалога.
   */
  async ensureDirectConversation(memberIds: [string, string], session: ClientSession): Promise<string> {
    if (memberIds[0] === memberIds[1]) {
      throw new ConflictException({ message: 'Cannot create conversation with self', code: 'SELF_CONV' });
    }
    const objectIds = memberIds.map((id) => new Types.ObjectId(id));
    const existing = await this.conversationModel
      .findOne({ type: ConversationType.DIRECT, memberIds: { $all: objectIds, $size: 2 } })
      .session(session)
      .lean();
    if (existing) return String(existing._id);

    const [created] = await this.conversationModel.create([{ type: ConversationType.DIRECT, memberIds: objectIds }], {
      session,
    });
    return created.id;
  }

  /**
   * Возвращает все переписки пользователя, отсортированные по дате последнего сообщения (новые первые).
   *
   * @param userId - ID текущего пользователя.
   * @returns Массив документов переписок.
   */
  async listForUser(userId: string): Promise<ConversationDocument[]> {
    const objectId = new Types.ObjectId(userId);

    return this.conversationModel.find({ memberIds: objectId }).sort({ 'lastMessage.createdAt': -1 }).lean();
  }

  /**
   * Проверяет, является ли пользователь участником переписки.
   *
   * @param conversationId - ID переписки.
   * @param userId - ID пользователя.
   * @returns `true`, если пользователь — участник.
   */
  async isMember(conversationId: string, userId: string): Promise<boolean> {
    const count = await this.conversationModel.countDocuments({
      _id: new Types.ObjectId(conversationId),
      memberIds: new Types.ObjectId(userId),
    });

    return count > 0;
  }

  /**
   * Создаёт Mongoose-транзакцию. Обёртка над `connection.startSession()` для удобного использования из модулей.
   *
   * @returns Готовая к использованию `ClientSession`.
   */
  startSession(): Promise<ClientSession> {
    return this.connection.startSession();
  }
}
