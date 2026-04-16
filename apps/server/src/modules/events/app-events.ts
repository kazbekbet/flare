import type { FriendshipView } from '../friends/friends.service.js';

/** Emitted when a new friend request is created. */
export interface FriendRequestCreatedEvent {
  type: 'FriendRequestCreated';
  addresseeId: string;
  friendship: FriendshipView;
}

/** Emitted when a friend request is accepted. */
export interface FriendRequestAcceptedEvent {
  type: 'FriendRequestAccepted';
  requesterId: string;
  friendship: FriendshipView;
  conversationId: string;
}

/** Discriminated union of all application events. */
export type AppEvent = FriendRequestCreatedEvent | FriendRequestAcceptedEvent;
