import { Logger, UseGuards } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import type { Server, Socket } from 'socket.io';

import { WsJwtGuard } from '../../common/guards/ws-jwt.guard.js';

/**
 * События, отправляемые сервером клиенту.
 * В Phase 1 gateway умеет только уведомлять о дружеских запросах.
 * События сообщений/presence добавляются в Phase 2.
 */
export const ServerEvents = {
  FRIEND_REQUEST: 'friend:request',
  FRIEND_ACCEPTED: 'friend:accepted',
} as const;

/**
 * WebSocket Gateway для real-time событий.
 * В Phase 1 — минимальная реализация: аутентификация через `WsJwtGuard`,
 * личная комната `user:<id>`, методы-хелперы для emit из других модулей.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  /**
   * Обработчик нового подключения. Ожидает, что `WsJwtGuard` уже проставил `socket.data.userId`.
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
  }

  /**
   * Обработчик отключения. В Phase 1 просто логируем — presence добавим в Phase 2.
   *
   * @param client - Отключающийся сокет.
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket ${client.id} disconnected`);
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
}
