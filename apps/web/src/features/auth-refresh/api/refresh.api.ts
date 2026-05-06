import { baseApi, unwrapEnvelope } from '@shared/api';

/**
 * Ответ сервера на `POST /auth/refresh`.
 *
 * @prop {string} accessToken - Новый JWT access-токен.
 * @prop {number} accessTokenExpiresIn - TTL access-токена в секундах.
 */
export interface RefreshResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
}

/**
 * Инжектированный эндпоинт обновления access-токена.
 * Refresh-токен передаётся через httpOnly cookie автоматически.
 */
export const refreshApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    refresh: build.mutation<RefreshResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      transformResponse: unwrapEnvelope<RefreshResponse>,
    }),
  }),
});

export const { useRefreshMutation } = refreshApi;
