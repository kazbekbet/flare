import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Subscription } from 'rxjs';

import { EventBusService } from '../events/event-bus.service.js';
import { ChatGateway, ServerEvents } from './chat.gateway.js';

/**
 * Связывает внутрипроцессную EventBus с WebSocket-клиентами.
 * Подписывается на AppEvent-ы и пересылает их через ChatGateway.emitToUser.
 */
@Injectable()
export class GatewayEventsBridge implements OnModuleInit, OnModuleDestroy {
  private subscription!: Subscription;

  constructor(
    private readonly eventBus: EventBusService,
    private readonly gateway: ChatGateway,
  ) {}

  onModuleInit(): void {
    this.subscription = this.eventBus.events$.subscribe((event) => {
      switch (event.type) {
        case 'FriendRequestCreated':
          this.gateway.emitToUser(event.addresseeId, ServerEvents.FRIEND_REQUEST, event.friendship);
          break;
        case 'FriendRequestAccepted':
          this.gateway.emitToUser(event.requesterId, ServerEvents.FRIEND_ACCEPTED, {
            friendship: event.friendship,
            conversationId: event.conversationId,
          });
          break;
      }
    });
  }

  onModuleDestroy(): void {
    this.subscription.unsubscribe();
  }
}
