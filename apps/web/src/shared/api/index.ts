export { baseApi, UNAUTHORIZED_EVENT } from './base-api';

/**
 * Утилита: вытаскивает `data` из ApiEnvelope.
 * Используется в `transformResponse` RTK-эндпоинтов.
 */
export const unwrapEnvelope = <T>(response: { data: T }): T => response.data;
