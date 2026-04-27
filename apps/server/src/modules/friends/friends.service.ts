import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { isValidObjectId, Model, Types } from 'mongoose';

import { type CreateFriendRequestDto, FriendshipStatus } from '@flare/shared';

import { ConversationsService } from '../conversations/conversations.service.js';
import { EventBusService } from '../events/event-bus.service.js';
import { Friendship, type FriendshipDocument } from '../mongoose/schemas/friendship.schema.js';
import { User, type UserDocument } from '../mongoose/schemas/user.schema.js';
import { type WithTimestamps } from '../mongoose/types.js';

/**
 * Представление friendship-записи, возвращаемое клиенту.
 *
 * @prop {string} id - ID записи.
 * @prop {string} requesterId - ID инициатора.
 * @prop {string} addresseeId - ID адресата.
 * @prop {FriendshipStatus} status - Текущий статус.
 * @prop {Date} createdAt - Дата создания.
 * @prop {Date} updatedAt - Дата последнего изменения.
 */
export interface FriendshipView {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Результат принятия запроса — содержит id созданной переписки.
 */
export interface AcceptFriendResult {
  friendship: FriendshipView;
  conversationId: string;
}

/**
 * Сервис управления связями дружбы.
 * Принятие запроса автоматически создаёт `DIRECT`-диалог в одной транзакции.
 */
@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name) private readonly friendshipModel: Model<FriendshipDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly conversationsService: ConversationsService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Создаёт запрос дружбы. Эмитит `friend:request` адресату через socket.
   *
   * @param requesterId - ID инициатора (текущий пользователь).
   * @param dto - Тело запроса.
   * @returns Созданная запись дружбы.
   */
  async createRequest(requesterId: string, dto: CreateFriendRequestDto): Promise<FriendshipView> {
    if (!isValidObjectId(dto.addresseeId)) {
      throw new NotFoundException({ message: 'Addressee not found', code: 'USER_NOT_FOUND' });
    }
    if (dto.addresseeId === requesterId) {
      throw new BadRequestException({ message: 'Cannot add yourself', code: 'SELF_REQUEST' });
    }
    const addressee = await this.userModel.exists({ _id: dto.addresseeId });
    if (!addressee) throw new NotFoundException({ message: 'Addressee not found', code: 'USER_NOT_FOUND' });

    const [a, b] = [requesterId, dto.addresseeId].sort();
    const duplicate = await this.friendshipModel.findOne({
      $or: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    });
    if (duplicate) {
      throw new ConflictException({
        message: 'Friendship already exists',
        code: 'FRIENDSHIP_EXISTS',
      });
    }

    const friendship = await this.friendshipModel.create({
      requesterId: new Types.ObjectId(requesterId),
      addresseeId: new Types.ObjectId(dto.addresseeId),
      status: FriendshipStatus.PENDING,
    });
    const view = this.toView(friendship);
    this.eventBus.emit({ type: 'FriendRequestCreated', addresseeId: dto.addresseeId, friendship: view });
    return view;
  }

  /**
   * Принимает запрос дружбы. Создаёт `DIRECT`-диалог в одной транзакции.
   * Принимать может только адресат.
   *
   * @param userId - ID текущего пользователя (должен быть адресатом).
   * @param friendshipId - ID записи дружбы.
   * @returns Обновлённая запись и id созданного/существующего диалога.
   */
  async accept(userId: string, friendshipId: string): Promise<AcceptFriendResult> {
    const friendship = await this.findPending(friendshipId);
    if (String(friendship.addresseeId) !== userId) {
      throw new BadRequestException({ message: 'Only addressee can accept', code: 'NOT_ADDRESSEE' });
    }

    const session = await this.conversationsService.startSession();
    try {
      let conversationId = '';
      await session.withTransaction(async () => {
        friendship.status = FriendshipStatus.ACCEPTED;
        await friendship.save({ session });
        conversationId = await this.conversationsService.ensureDirectConversation(
          [String(friendship.requesterId), String(friendship.addresseeId)],
          session,
        );
      });

      const view = this.toView(friendship);
      this.eventBus.emit({
        type: 'FriendRequestAccepted',
        requesterId: String(friendship.requesterId),
        friendship: view,
        conversationId,
      });

      return { friendship: view, conversationId };
    } finally {
      await session.endSession();
    }
  }

  /**
   * Отклоняет запрос дружбы. Только адресат может отклонить.
   * Conversation НЕ создаётся.
   *
   * @param userId - ID текущего пользователя (должен быть адресатом).
   * @param friendshipId - ID записи дружбы.
   * @returns Обновлённая запись.
   */
  async decline(userId: string, friendshipId: string): Promise<FriendshipView> {
    const friendship = await this.findPending(friendshipId);
    if (String(friendship.addresseeId) !== userId) {
      throw new BadRequestException({ message: 'Only addressee can decline', code: 'NOT_ADDRESSEE' });
    }
    friendship.status = FriendshipStatus.DECLINED;
    await friendship.save();
    return this.toView(friendship);
  }

  /**
   * Возвращает список связей дружбы текущего пользователя (ACCEPTED и PENDING).
   *
   * @param userId - ID пользователя.
   * @returns Массив записей.
   */
  async list(userId: string): Promise<FriendshipView[]> {
    const rows = await this.friendshipModel
      .find({
        $or: [{ requesterId: userId }, { addresseeId: userId }],
        status: { $in: [FriendshipStatus.PENDING, FriendshipStatus.ACCEPTED] },
      })
      .sort({ updatedAt: -1 });
    return rows.map((r) => this.toView(r));
  }

  private async findPending(friendshipId: string): Promise<FriendshipDocument> {
    if (!isValidObjectId(friendshipId)) {
      throw new NotFoundException({ message: 'Friendship not found', code: 'FRIENDSHIP_NOT_FOUND' });
    }
    const friendship = await this.friendshipModel.findById(friendshipId);
    if (!friendship) {
      throw new NotFoundException({ message: 'Friendship not found', code: 'FRIENDSHIP_NOT_FOUND' });
    }
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException({
        message: `Cannot act on friendship in status ${friendship.status}`,
        code: 'FRIENDSHIP_NOT_PENDING',
      });
    }
    return friendship;
  }

  private toView(doc: FriendshipDocument): FriendshipView {
    const d = doc as WithTimestamps<FriendshipDocument>;
    return {
      id: doc.id,
      requesterId: String(doc.requesterId),
      addresseeId: String(doc.addresseeId),
      status: doc.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
