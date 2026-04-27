import type { Socket } from 'socket.io-client';

/**
 * Элемент очереди исходящих событий.
 *
 * @prop event - Имя события Socket.io.
 * @prop payload - Произвольные данные для отправки.
 */
interface QueueItem {
  event: string;
  payload: unknown;
}

/** Очередь событий, накопленных за время оффлайн. */
const queue: QueueItem[] = [];

/**
 * Добавляет событие в очередь. Используется, когда сокет не подключён,
 * чтобы отправить его при восстановлении соединения.
 *
 * @param event - Имя Socket.io-события.
 * @param payload - Данные события.
 */
export function enqueue(event: string, payload: unknown): void {
  queue.push({ event, payload });
}

/**
 * Отправляет все накопленные события через переданный сокет
 * и очищает очередь. Вызывается при восстановлении подключения.
 *
 * @param socket - Подключённый Socket.io-клиент.
 */
export function flush(socket: Socket): void {
  while (queue.length > 0) {
    const item = queue.shift()!;

    socket.emit(item.event, item.payload);
  }
}

/**
 * Безопасная отправка события: если сокет подключён — отправляет сразу,
 * иначе помещает в оффлайн-очередь.
 *
 * @param socket - Socket.io-клиент.
 * @param event - Имя события.
 * @param payload - Данные события.
 */
export function emitOrQueue(socket: Socket, event: string, payload: unknown): void {
  if (socket.connected) {
    socket.emit(event, payload);
  } else {
    enqueue(event, payload);
  }
}
