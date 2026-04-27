import { Logger, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { isValidObjectId, Model, Types } from 'mongoose';
import type { Server, Socket } from 'socket.io';

import { SendMessageDtoSchema } from '@flare/shared';

import { WsJwtGuard } from '../../common/guards/ws-jwt.guard.js';
import { EventBusService } from '../events/event-bus.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { Conversation, type ConversationDocument } from '../mongoose/schemas/conversation.schema.js';
import { Presence, type PresenceDocument } from '../mongoose/schemas/presence.schema.js';

/**
 * События, отправляемые сервером клиенту.
 */
export const ServerEvents = {
  FRIEND_REQUEST: 'friend:request',
  FRIEND_ACCEPTED: 'friend:accepted',
  PRESENCE_CHANGE: 'presence:change',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
} as const;

/**
 * WebSocket Gateway для real-time событий.
 * Обеспечивает аутентификацию через `WsJwtGuard`, presence-менеджмент,
 * отправку/доставку/прочтение сообщений и комнаты переписок.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectModel(Presence.name) private readonly presenceModel: Model<PresenceDocument>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
    private readonly messagesService: MessagesService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Обработчик нового подключения.
   * Подключает пользователя к личной комнате и комнатам всех переписок,
   * создаёт/обновляет запись Presence, рассылает `presence:change` участникам.
   *
   * @param client - Подключающийся сокет.
   */
  async handleConnection(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      client.disconnect(true);
      return;
    }

    await client.join(this.userRoom(userId));
    this.logger.debug(`Socket ${client.id} joined room ${this.userRoom(userId)}`);

    const conversations = await this.conversationModel
      .find({ memberIds: new Types.ObjectId(userId) }, { _id: 1, memberIds: 1 })
      .lean();

    const convRooms = conversations.map((c) => this.convRoom(String(c._id)));

    if (convRooms.length > 0) {
      await client.join(convRooms);
      this.logger.debug(`Socket ${client.id} joined ${convRooms.length} conversation rooms`);
    }

    await this.presenceModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $set: { updatedAt: new Date() } },
      { upsert: true },
    );

    const memberIds = this.extractUniqueMemberIds(conversations, userId);

    for (const memberId of memberIds) {
      this.server.to(this.userRoom(memberId)).emit(ServerEvents.PRESENCE_CHANGE, {
        userId,
        online: true,
      });
    }
  }

  /**
   * Обработчик отключения.
   * Удаляет запись Presence и рассылает `presence:change` с `online: false`.
   *
   * @param client - Отключающийся сокет.
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;

    if (!userId) return;

    this.logger.debug(`Socket ${client.id} disconnected`);

    const otherSockets = await this.server.in(this.userRoom(userId)).fetchSockets();
    const stillConnected = otherSockets.some((s) => s.id !== client.id);

    if (stillConnected) return;

    await this.presenceModel.deleteOne({ userId: new Types.ObjectId(userId) });

    const conversations = await this.conversationModel
      .find({ memberIds: new Types.ObjectId(userId) }, { memberIds: 1 })
      .lean();

    const memberIds = this.extractUniqueMemberIds(conversations, userId);

    for (const memberId of memberIds) {
      this.server.to(this.userRoom(memberId)).emit(ServerEvents.PRESENCE_CHANGE, {
        userId,
        online: false,
      });
    }
  }

  /**
   * Heartbeat-обработчик. Клиент шлёт каждые ~30с для продления TTL записи Presence.
   *
   * @param client - Сокет, приславший heartbeat.
   * @returns Подтверждение (ack).
   */
  @SubscribeMessage('presence:heartbeat')
  async handleHeartbeat(client: Socket): Promise<{ event: string; data: { ok: true } }> {
    const userId = client.data.userId as string;

    await this.presenceModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $set: { updatedAt: new Date() } },
      { upsert: true },
    );

    return { event: 'presence:heartbeat', data: { ok: true } };
  }

  /**
   * Обработчик отправки сообщения.
   * Валидирует DTO, проверяет членство в переписке, создаёт сообщение,
   * рассылает `message:new` участникам комнаты.
   *
   * @param client - Сокет отправителя.
   * @param payload - Данные сообщения (conversationId, encryptedContent, nonce, type?, media?).
   * @returns Подтверждение с ID созданного сообщения.
   */
  @SubscribeMessage('message:send')
  async handleMessageSend(
    client: Socket,
    payload: unknown,
  ): Promise<{ event: string; data: { ok: true; messageId: string } | { ok: false; error: string } }> {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      return { event: 'message:send', data: { ok: false, error: 'Not authenticated' } };
    }

    const parsed = SendMessageDtoSchema.safeParse(payload);

    if (!parsed.success) {
      return { event: 'message:send', data: { ok: false, error: 'Invalid payload' } };
    }

    const dto = parsed.data;

    const conversation = await this.conversationModel
      .findOne({ _id: new Types.ObjectId(dto.conversationId), memberIds: new Types.ObjectId(userId) })
      .lean();

    if (!conversation) {
      return { event: 'message:send', data: { ok: false, error: 'Not a member of this conversation' } };
    }

    const message = await this.messagesService.create({
      ...dto,
      senderId: userId,
    });

    this.server.to(this.convRoom(dto.conversationId)).emit(ServerEvents.MESSAGE_NEW, {
      _id: String(message._id),
      conversationId: dto.conversationId,
      senderId: userId,
      encryptedContent: dto.encryptedContent,
      nonce: dto.nonce,
      type: dto.type,
      media: dto.media,
      createdAt: (message as unknown as { createdAt: Date }).createdAt,
    });

    this.eventBus.emit({
      type: 'MessageSent',
      conversationId: dto.conversationId,
      messageId: String(message._id),
      senderId: userId,
    });

    return { event: 'message:send', data: { ok: true, messageId: String(message._id) } };
  }

  /**
   * Обработчик подтверждения доставки сообщений.
   * Помечает сообщения как доставленные и уведомляет отправителей.
   *
   * @param client - Сокет получателя.
   * @param payload - Объект с массивом `messageIds`.
   * @returns Подтверждение (ack).
   */
  @SubscribeMessage('message:delivered')
  async handleMessageDelivered(
    client: Socket,
    payload: { messageIds?: string[] },
  ): Promise<{ event: string; data: { ok: boolean; error?: string } }> {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      return { event: 'message:delivered', data: { ok: false, error: 'Not authenticated' } };
    }

    const messageIds = payload?.messageIds;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return { event: 'message:delivered', data: { ok: false, error: 'Invalid messageIds' } };
    }

    if (!messageIds.every((id) => isValidObjectId(id))) {
      return { event: 'message:delivered', data: { ok: false, error: 'Invalid messageId format' } };
    }

    await this.messagesService.markDelivered(messageIds, userId);

    const senderIds = await this.messagesService.getSenderIds(messageIds);

    for (const senderId of senderIds) {
      this.server.to(this.userRoom(senderId)).emit(ServerEvents.MESSAGE_DELIVERED, {
        messageIds,
        deliveredBy: userId,
      });
    }

    return { event: 'message:delivered', data: { ok: true } };
  }

  /**
   * Обработчик прочтения сообщений в переписке.
   * Помечает все непрочитанные сообщения как прочитанные и уведомляет остальных участников.
   *
   * @param client - Сокет читателя.
   * @param payload - Объект с `conversationId`.
   * @returns Подтверждение (ack).
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    client: Socket,
    payload: { conversationId?: string },
  ): Promise<{ event: string; data: { ok: boolean; error?: string } }> {
    const userId = client.data.userId as string | undefined;

    if (!userId) {
      return { event: 'message:read', data: { ok: false, error: 'Not authenticated' } };
    }

    const conversationId = payload?.conversationId;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return { event: 'message:read', data: { ok: false, error: 'Invalid conversationId' } };
    }

    const conversation = await this.conversationModel
      .findOne({ _id: new Types.ObjectId(conversationId), memberIds: new Types.ObjectId(userId) })
      .lean();

    if (!conversation) {
      return { event: 'message:read', data: { ok: false, error: 'Not a member of this conversation' } };
    }

    await this.messagesService.markRead(conversationId, userId);

    const otherMemberIds = conversation.memberIds.map((id) => String(id)).filter((id) => id !== userId);

    for (const memberId of otherMemberIds) {
      this.server.to(this.userRoom(memberId)).emit(ServerEvents.MESSAGE_READ, {
        conversationId,
        readBy: userId,
      });
    }

    return { event: 'message:read', data: { ok: true } };
  }

  /**
   * Отправляет событие конкретному пользователю (всем его сокетам).
   *
   * @param userId - ID получателя.
   * @param event - Имя события.
   * @param payload - Данные события.
   */
  emitToUser<T>(userId: string, event: string, payload: T): void {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private convRoom(conversationId: string): string {
    return `conv:${conversationId}`;
  }

  /**
   * Извлекает уникальные ID участников из массива переписок, исключая указанного пользователя.
   *
   * @param conversations - Массив переписок с `memberIds`.
   * @param excludeUserId - ID пользователя, которого нужно исключить.
   * @returns Массив уникальных ID участников.
   */
  private extractUniqueMemberIds(
    conversations: Array<{ memberIds: Types.ObjectId[] }>,
    excludeUserId: string,
  ): string[] {
    const memberSet = new Set<string>();

    for (const conv of conversations) {
      for (const memberId of conv.memberIds) {
        const id = String(memberId);

        if (id !== excludeUserId) {
          memberSet.add(id);
        }
      }
    }

    return [...memberSet];
  }
}
