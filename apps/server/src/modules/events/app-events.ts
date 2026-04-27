import type { FriendshipView } from '../friends/friends.service.js';

/** Отправляется при создании нового запроса дружбы. */
export interface FriendRequestCreatedEvent {
  type: 'FriendRequestCreated';
  addresseeId: string;
  friendship: FriendshipView;
}

/** Отправляется при принятии запроса дружбы. */
export interface FriendRequestAcceptedEvent {
  type: 'FriendRequestAccepted';
  requesterId: string;
  friendship: FriendshipView;
  conversationId: string;
}

/** Отправляется после создания нового сообщения в переписке. */
export interface MessageSentEvent {
  type: 'MessageSent';
  conversationId: string;
  messageId: string;
  senderId: string;
}

/** Размеченное объединение всех событий приложения. */
export type AppEvent = FriendRequestCreatedEvent | FriendRequestAcceptedEvent | MessageSentEvent;
