/**
 * Типизированные переменные окружения Flare-сервера.
 * Соответствует Joi-схеме из `env.validation.ts`.
 *
 * @prop {'development' | 'production' | 'test'} NODE_ENV - Режим запуска.
 * @prop {number} PORT - Порт HTTP-сервера.
 * @prop {string} LOG_LEVEL - Уровень логирования Pino.
 * @prop {string} MONGO_URI - Строка подключения к MongoDB (Replica Set).
 * @prop {string} JWT_ACCESS_SECRET - Секрет для подписи access-токенов.
 * @prop {string} JWT_REFRESH_SECRET - Секрет для подписи refresh-токенов.
 * @prop {string} JWT_ACCESS_TTL - TTL access-токена (формат ms/jsonwebtoken, напр. '15m').
 * @prop {string} JWT_REFRESH_TTL - TTL refresh-токена (напр. '7d').
 * @prop {string} [CORS_ORIGIN] - Список разрешённых origin через запятую (по умолчанию — any).
 * @prop {number} THROTTLE_TTL - Окно rate-limit в секундах.
 * @prop {number} THROTTLE_LIMIT - Лимит запросов в окне.
 */
export interface AppEnv {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  MONGO_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL: string;
  JWT_REFRESH_TTL: string;
  CORS_ORIGIN?: string;
  THROTTLE_TTL: number;
  THROTTLE_LIMIT: number;
}
