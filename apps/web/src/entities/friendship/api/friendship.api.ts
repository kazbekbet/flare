import { baseApi, unwrapEnvelope } from '@shared/api';

import type { CreateFriendRequestDto, FriendshipStatus } from '@flare/shared';

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
 * Инжектированные эндпоинты `friends`.
 * Теги:
 *  - `Friendship` — провайдится `getFriends`, инвалидируется всеми мутациями.
 */
export const friendshipApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFriends: build.query<FriendshipView[], void>({
      query: () => ({ url: '/friends' }),
      transformResponse: unwrapEnvelope<FriendshipView[]>,
      providesTags: ['Friendship'],
    }),
    sendFriendRequest: build.mutation<FriendshipView, CreateFriendRequestDto>({
      query: (body) => ({ url: '/friends/request', method: 'POST', body }),
      transformResponse: unwrapEnvelope<FriendshipView>,
      invalidatesTags: ['Friendship'],
    }),
    acceptFriend: build.mutation<AcceptFriendResult, string>({
      query: (friendshipId) => ({ url: `/friends/${friendshipId}/accept`, method: 'PATCH' }),
      transformResponse: unwrapEnvelope<AcceptFriendResult>,
      invalidatesTags: ['Friendship'],
    }),
    declineFriend: build.mutation<FriendshipView, string>({
      query: (friendshipId) => ({ url: `/friends/${friendshipId}/decline`, method: 'PATCH' }),
      transformResponse: unwrapEnvelope<FriendshipView>,
      invalidatesTags: ['Friendship'],
    }),
  }),
});

export const { useAcceptFriendMutation, useDeclineFriendMutation, useGetFriendsQuery, useSendFriendRequestMutation } =
  friendshipApi;
