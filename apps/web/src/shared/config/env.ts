/**
 * Типизированный доступ к переменным окружения Vite (префикс `VITE_`).
 * Значения определяются на этапе сборки.
 *
 * @prop {string} apiBaseUrl - Базовый URL REST API (с завершающим `/api` или без).
 * @prop {string} socketUrl - URL Socket.io-сервера.
 */
export interface WebEnv {
  apiBaseUrl: string;
  socketUrl: string;
}

/** Фактические значения ENV для текущей сборки. */
export const env: WebEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? '/',
};
