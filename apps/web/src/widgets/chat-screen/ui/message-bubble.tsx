import { Group, Paper, Text } from '@mantine/core';

/** Пропсы компонента пузырька сообщения. */
interface MessageBubbleProps {
  /** Расшифрованный текст сообщения. */
  text: string;
  /** Дата создания сообщения (ISO-строка). */
  createdAt: string;
  /** Принадлежит ли сообщение текущему пользователю. */
  isMine: boolean;
  /** Сообщение доставлено получателю. */
  delivered?: boolean;
  /** Сообщение прочитано получателем. */
  read?: boolean;
}

/**
 * Индикатор статуса доставки сообщения.
 * Одна галочка — отправлено, двойная — доставлено, синяя двойная — прочитано.
 */
function DeliveryStatus({ delivered, read, isMine }: Pick<MessageBubbleProps, 'delivered' | 'read' | 'isMine'>) {
  if (!isMine) return null;

  const color = read
    ? 'var(--mantine-color-blue-1)'
    : delivered
      ? 'var(--mantine-color-blue-1)'
      : 'var(--mantine-color-gray-4)';
  const symbol = read || delivered ? '\u2713\u2713' : '\u2713';

  return (
    <Text component="span" size="xs" c={color}>
      {symbol}
    </Text>
  );
}

/**
 * Пузырёк отдельного сообщения в чате.
 * Собственные сообщения отображаются справа с акцентным фоном,
 * чужие — слева с серым фоном.
 */
export function MessageBubble({ text, createdAt, isMine, delivered, read }: MessageBubbleProps) {
  const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Group justify={isMine ? 'flex-end' : 'flex-start'} w="100%">
      <Paper p="xs" radius="md" maw="70%" bg={isMine ? 'blue.6' : 'gray.1'} c={isMine ? 'white' : undefined}>
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </Text>

        <Group gap={4} justify="flex-end" mt={2}>
          <Text size="xs" c={isMine ? 'blue.1' : 'dimmed'}>
            {time}
          </Text>

          <DeliveryStatus isMine={isMine} delivered={delivered} read={read} />
        </Group>
      </Paper>
    </Group>
  );
}
