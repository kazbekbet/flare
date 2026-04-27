export { baseApi, UNAUTHORIZED_EVENT } from './base-api';
export { emitOrQueue, enqueue, flush } from './offline-queue';
export { connectSocket, disconnectSocket, getSocket } from './socket-client';
export { socketListenerMiddleware } from './socket-middleware';

/**
 * Утилита: вытаскивает `data` из ApiEnvelope.
 * Используется в `transformResponse` RTK-эндпоинтов.
 */
export const unwrapEnvelope = <T>(response: { data: T }): T => response.data;
