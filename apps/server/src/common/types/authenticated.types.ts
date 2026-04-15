import type { Request } from 'express';

/**
 * Полезная нагрузка JWT access-токена.
 *
 * @prop {string} sub - ID пользователя (MongoDB ObjectId как строка).
 * @prop {string} [jti] - JWT ID — уникальный идентификатор токена (для отзыва).
 * @prop {number} [iat] - Время выдачи токена (Unix seconds).
 * @prop {number} [exp] - Время истечения токена (Unix seconds).
 */
export interface JwtAccessPayload {
  sub: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Полезная нагрузка JWT refresh-токена. Обязательно содержит `jti` — ID сессии.
 *
 * @prop {string} sub - ID пользователя.
 * @prop {string} jti - ID сессии (для ротации и отзыва).
 * @prop {number} [iat] - Время выдачи.
 * @prop {number} [exp] - Время истечения.
 */
export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

/**
 * Пользователь, прикреплённый к запросу после прохождения `JwtAuthGuard`.
 *
 * @prop {string} id - ID аутентифицированного пользователя.
 */
export interface AuthenticatedUser {
  id: string;
}

/**
 * Express-request, обогащённый аутентифицированным пользователем.
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
