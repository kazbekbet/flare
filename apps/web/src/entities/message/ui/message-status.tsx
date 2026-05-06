import { Text } from '@mantine/core';

/**
 * Пропсы компонента статуса сообщения.
 *
 * @prop {string} [deliveredAt] - ISO-дата доставки сообщения.
 * @prop {string} [readAt] - ISO-дата прочтения сообщения.
 * @prop {boolean} isMine - Является ли сообщение собственным.
 */
export interface MessageStatusProps {
  deliveredAt?: string;
  readAt?: string;
  isMine: boolean;
}

/**
 * Индикатор статуса доставки/прочтения сообщения.
 *
 * - Отправлено (нет deliveredAt): одна серая галочка (✓).
 * - Доставлено (deliveredAt, нет readAt): две серые галочки (✓✓).
 * - Прочитано (readAt): две синие галочки (✓✓).
 *
 * Отображается только для собственных сообщений (`isMine === true`).
 */
export function MessageStatus({ deliveredAt, readAt, isMine }: MessageStatusProps) {
  if (!isMine) {
    return null;
  }

  const isRead = Boolean(readAt);
  const isDelivered = Boolean(deliveredAt);

  const label = isRead ? '✓✓' : isDelivered ? '✓✓' : '✓';
  const color = isRead ? 'blue' : 'dimmed';

  return (
    <Text component="span" size="xs" c={color}>
      {label}
    </Text>
  );
}
