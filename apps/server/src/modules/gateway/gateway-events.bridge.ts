import { Injectable, OnModuleInit } from '@nestjs/common';

import { EventBusService } from '../events/event-bus.service.js';
import { ChatGateway, ServerEvents } from './chat.gateway.js';

/**
 * Bridges the in-process EventBus to WebSocket clients.
 * Subscribes to AppEvents and forwards them via ChatGateway.emitToUser.
 */
@Injectable()
export class GatewayEventsBridge implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly gateway: ChatGateway,
  ) {}

  onModuleInit(): void {
    this.eventBus.events$.subscribe((event) => {
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
}
