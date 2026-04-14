import type { UpdateUserDto } from '@flare/shared';

import { httpClient, unwrap } from '../../../shared/api/index.js';

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

/**
 * Публичный ключ пользователя — то, что сервер отдаёт по `GET /users/:id/public-key`.
 */
export interface PublicKeyResponse {
  userId: string;
  publicKey: string;
}

/**
 * Запрос собственного профиля.
 *
 * @returns Приватный профиль текущего пользователя.
 */
export async function fetchMe(): Promise<PrivateUserProfile> {
  const response = await httpClient.get<{ data: PrivateUserProfile }>('/users/me');
  return unwrap(response);
}

/**
 * Обновление собственного профиля (PATCH).
 *
 * @param dto - Патч с полями для обновления.
 * @returns Актуальный профиль после обновления.
 */
export async function updateMe(dto: UpdateUserDto): Promise<PrivateUserProfile> {
  const response = await httpClient.patch<{ data: PrivateUserProfile }>('/users/me', dto);
  return unwrap(response);
}

/**
 * Запрос публичного ключа другого пользователя по ID (для E2E-шифрования).
 *
 * @param userId - ID пользователя.
 * @returns Объект с Base64 публичным ключом.
 */
export async function fetchPublicKey(userId: string): Promise<PublicKeyResponse> {
  const response = await httpClient.get<{ data: PublicKeyResponse }>(`/users/${userId}/public-key`);
  return unwrap(response);
}
