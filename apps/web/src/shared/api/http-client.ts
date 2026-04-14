import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

import { env } from '../config/index.js';

/**
 * Ответ успешного вызова API (transform interceptor на сервере оборачивает всё в `{ data }`).
 *
 * @prop {T} data - Полезная нагрузка.
 */
export interface ApiEnvelope<T> {
  data: T;
}

/**
 * Тело ошибки API (глобальный exception filter сервера).
 *
 * @prop {number} statusCode - HTTP-статус.
 * @prop {string} message - Короткое описание.
 * @prop {string} [code] - Машиночитаемый код ошибки.
 * @prop {unknown} [details] - Детали (валидация и т.д.).
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
}

/** Имя события, которое эмитится при 401 — entities/session подписывается и делает logout. */
export const UNAUTHORIZED_EVENT = 'flare:unauthorized';

/** Единственный экземпляр Axios для всего приложения. */
export const httpClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

let currentAccessToken: string | null = null;

/**
 * Устанавливает access-токен для всех последующих запросов.
 * Вызывается из `entities/session` при login/refresh.
 *
 * @param token - JWT access-токен или `null` для разлогина.
 */
export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

httpClient.interceptors.request.use((config) => {
  if (currentAccessToken) {
    config.headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

/**
 * Утилита: разворачивает `{ data }` конверт, возвращая полезную нагрузку.
 *
 * @param response - Ответ Axios.
 * @returns Полезная нагрузка `T`.
 */
export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data;
}
