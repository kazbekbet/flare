import { baseApi, unwrapEnvelope } from '@shared/api';

import type { LoginDto } from '@flare/shared';

/**
 * Ответ сервера на `POST /auth/login`.
 *
 * @prop {string} userId - ID пользователя.
 * @prop {string} accessToken - JWT access-токен.
 * @prop {number} accessTokenExpiresIn - TTL access-токена в секундах.
 */
export interface LoginResponse {
  userId: string;
  accessToken: string;
  accessTokenExpiresIn: number;
}

/**
 * Инжектированный эндпоинт входа по challenge-подписи.
 */
export const loginApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginDto>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: unwrapEnvelope<LoginResponse>,
    }),
  }),
});

export const { useLoginMutation } = loginApi;
