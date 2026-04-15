import { baseApi, unwrapEnvelope } from '@shared/api';

import type { UpdateUserDto } from '@flare/shared';

/**
 * Приватный профиль — данные, доступные только самому пользователю.
 */
export interface PrivateUserProfile {
  id: string;
  displayName: string;
  publicKey: string;
  avatarUrl?: string;
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
}

/** Ответ `GET /users/:id/public-key`. */
export interface PublicKeyResponse {
  userId: string;
  publicKey: string;
}

/**
 * Инжектированные эндпоинты `users`.
 * Теги:
 *  - `Me` — провайдится `getMe`, инвалидируется `updateMe`.
 */
export const userApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<PrivateUserProfile, void>({
      query: () => ({ url: '/users/me' }),
      transformResponse: unwrapEnvelope<PrivateUserProfile>,
      providesTags: ['Me'],
    }),
    updateMe: build.mutation<PrivateUserProfile, UpdateUserDto>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      transformResponse: unwrapEnvelope<PrivateUserProfile>,
      invalidatesTags: ['Me'],
    }),
    getPublicKey: build.query<PublicKeyResponse, string>({
      query: (userId) => ({ url: `/users/${userId}/public-key` }),
      transformResponse: unwrapEnvelope<PublicKeyResponse>,
    }),
  }),
});

export const { useGetMeQuery, useUpdateMeMutation, useGetPublicKeyQuery, useLazyGetPublicKeyQuery } = userApi;
