import type { CreateFriendRequestDto, FriendshipStatus } from '@flare/shared';

import { httpClient, unwrap } from '../../../shared/api/index.js';

/** Представление связи дружбы, возвращаемое сервером. */
export interface FriendshipView {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

/** Результат принятия запроса — содержит id созданной переписки. */
export interface AcceptFriendResult {
  friendship: FriendshipView;
  conversationId: string;
}

/**
 * Отправить запрос на добавление в друзья.
 *
 * @param dto - Тело запроса с `addresseeId`.
 * @returns Созданная связь дружбы.
 */
export async function sendFriendRequest(dto: CreateFriendRequestDto): Promise<FriendshipView> {
  const response = await httpClient.post<{ data: FriendshipView }>('/friends/request', dto);
  return unwrap(response);
}

/**
 * Принять запрос на добавление в друзья.
 *
 * @param friendshipId - ID записи дружбы.
 * @returns Обновлённая связь + id созданного DIRECT-диалога.
 */
export async function acceptFriend(friendshipId: string): Promise<AcceptFriendResult> {
  const response = await httpClient.patch<{ data: AcceptFriendResult }>(`/friends/${friendshipId}/accept`);
  return unwrap(response);
}

/**
 * Отклонить запрос на добавление в друзья.
 *
 * @param friendshipId - ID записи дружбы.
 * @returns Обновлённая связь.
 */
export async function declineFriend(friendshipId: string): Promise<FriendshipView> {
  const response = await httpClient.patch<{ data: FriendshipView }>(`/friends/${friendshipId}/decline`);
  return unwrap(response);
}

/**
 * Получить список активных связей дружбы текущего пользователя.
 *
 * @returns Массив связей.
 */
export async function listFriends(): Promise<FriendshipView[]> {
  const response = await httpClient.get<{ data: FriendshipView[] }>('/friends');
  return unwrap(response);
}
