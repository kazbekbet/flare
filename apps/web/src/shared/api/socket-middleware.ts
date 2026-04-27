import { accessTokenRefreshed, authenticated, loggedOut } from '@entities/session';
import { createListenerMiddleware } from '@reduxjs/toolkit';

import { baseApi } from './base-api';
import { flush } from './offline-queue';
import { connectSocket, disconnectSocket, getSocket } from './socket-client';

/** Интервал отправки heartbeat-пакетов для онлайн-статуса (мс). */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** ID таймера heartbeat. */
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * RTK listener middleware для управления Socket.io-соединением.
 *
 * - При аутентификации / обновлении токена подключает сокет.
 * - При логауте отключает сокет.
 * - Слушает серверные события и диспатчит соответствующие экшены.
 * - Поддерживает heartbeat для онлайн-статуса.
 */
export const socketListenerMiddleware = createListenerMiddleware();

/** Привязывает обработчики серверных событий к сокету. */
function bindSocketEvents(dispatch: (action: unknown) => void): void {
  const socket = getSocket();

  socket.on('connect', () => {
    flush(socket);

    heartbeatInterval = setInterval(() => {
      socket.emit('presence:heartbeat');
    }, HEARTBEAT_INTERVAL_MS);
  });

  socket.on('disconnect', () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });

  socket.on('friend:request', () => {
    dispatch(baseApi.util.invalidateTags(['Friendship']));
  });

  socket.on('friend:accepted', () => {
    dispatch(baseApi.util.invalidateTags(['Friendship']));
  });
}

/** Флаг: обработчики событий уже привязаны к сокету. */
let eventsBound = false;

/**
 * При `authenticated` — подключаем сокет с токеном из payload
 * и привязываем серверные обработчики (один раз).
 */
socketListenerMiddleware.startListening({
  actionCreator: authenticated,
  effect: (action, listenerApi) => {
    const token = action.payload.accessToken;

    if (!eventsBound) {
      bindSocketEvents(listenerApi.dispatch);
      eventsBound = true;
    }

    connectSocket(token);
  },
});

/**
 * При обновлении access-токена — переподключаем сокет с новым токеном.
 */
socketListenerMiddleware.startListening({
  actionCreator: accessTokenRefreshed,
  effect: (action, listenerApi) => {
    const token = action.payload;

    if (!eventsBound) {
      bindSocketEvents(listenerApi.dispatch);
      eventsBound = true;
    }

    connectSocket(token);
  },
});

/**
 * При логауте — разрываем соединение.
 */
socketListenerMiddleware.startListening({
  actionCreator: loggedOut,
  effect: () => {
    disconnectSocket();
  },
});
