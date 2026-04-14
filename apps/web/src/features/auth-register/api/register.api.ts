import { baseApi, unwrapEnvelope } from '@shared/api';

import type { RegisterDto } from '@flare/shared';

/**
 * Ответ сервера на `POST /auth/register`.
 *
 * @prop {string} userId - ID созданного пользователя.
 * @prop {string} accessToken - JWT access-токен.
 * @prop {number} accessTokenExpiresIn - TTL access-токена в секундах.
 */
export interface RegisterResponse {
  userId: string;
  accessToken: string;
  accessTokenExpiresIn: number;
}

/**
 * Инжектированные auth-эндпоинты.
 * Refresh-токен сервер ставит в httpOnly cookie — отдельного эндпоинта `refresh`
 * на фронте нет, он вызывается через middleware при 401 (Phase 2).
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<RegisterResponse, RegisterDto>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: unwrapEnvelope<RegisterResponse>,
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
  }),
});

export const { useLogoutMutation, useRegisterMutation } = authApi;
