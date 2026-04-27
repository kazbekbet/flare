import { env } from '@shared/config';
import { io, type Socket } from 'socket.io-client';

/** Единственный экземпляр Socket.io-клиента. */
let socket: Socket | null = null;

/**
 * Возвращает (или создаёт) синглтон Socket.io-клиента.
 * Подключение не устанавливается автоматически — нужно вызвать {@link connectSocket}.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(env.socketUrl, {
      autoConnect: false,
      withCredentials: true,
    });
  }

  return socket;
}

/**
 * Подключает сокет к серверу с переданным JWT-токеном.
 *
 * @param token - Access-токен текущей сессии.
 */
export function connectSocket(token: string): void {
  const s = getSocket();

  s.auth = { token };
  s.connect();
}

/** Разрывает текущее соединение (если было установлено). */
export function disconnectSocket(): void {
  socket?.disconnect();
}
