import type { RegisterDto } from '@flare/shared';

import { httpClient, unwrap } from '../../../shared/api/index.js';

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
 * Регистрирует нового пользователя. Refresh-токен сервер ставит в httpOnly cookie.
 *
 * @param dto - DTO регистрации.
 * @returns Ответ с userId и accessToken.
 */
export async function registerRequest(dto: RegisterDto): Promise<RegisterResponse> {
  const response = await httpClient.post<{ data: RegisterResponse }>('/auth/register', dto);
  return unwrap(response);
}

/**
 * Выполняет logout: инвалидирует сессию и очищает cookie.
 */
export async function logoutRequest(): Promise<void> {
  await httpClient.post('/auth/logout');
}
