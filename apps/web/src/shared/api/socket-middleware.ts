import { messageReceived, messagesDelivered, messagesRead, type MessageView } from '@entities/message';
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

/**
 * Привязывает обработчики серверных событий к сокету.
 *
 * @param dispatch - Функция диспатча Redux.
 * @param getState - Функция получения текущего state Redux.
 */
function bindSocketEvents(
  dispatch: (action: unknown) => void,
  getState: () => { session: { userId: string | null } },
): void {
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

  socket.on('message:new', (msg: MessageView) => {
    dispatch(messageReceived({ conversationId: msg.conversationId, message: msg }));
    dispatch(baseApi.util.invalidateTags(['Conversation']));

    const currentUserId = getState().session.userId;

    if (msg.senderId !== currentUserId) {
      socket.emit('message:delivered', { messageIds: [msg._id] });
    }
  });

  socket.on('message:delivered', (payload: { messageIds: string[]; deliveredAt: string }) => {
    dispatch(messagesDelivered(payload));
  });

  socket.on('message:read', (payload: { conversationId: string; readAt: string }) => {
    dispatch(messagesRead(payload));
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
      bindSocketEvents(listenerApi.dispatch, listenerApi.getState as () => { session: { userId: string | null } });
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
      bindSocketEvents(listenerApi.dispatch, listenerApi.getState as () => { session: { userId: string | null } });
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
