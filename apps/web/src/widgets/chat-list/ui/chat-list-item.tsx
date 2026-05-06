import type { ConversationView } from '@entities/conversation';
import { Avatar, Group, Indicator, Stack, Text, UnstyledButton } from '@mantine/core';
import { ROUTES } from '@shared/config';
import { Link } from '@tanstack/react-router';

interface ChatListItemProps {
  conversation: ConversationView;
}

/**
 * Элемент списка чатов.
 * Показывает аватар-заглушку, имя переписки, превью последнего сообщения и дату.
 */
export function ChatListItem({ conversation }: ChatListItemProps) {
  const displayName =
    conversation.type === 'GROUP' ? `Группа (${conversation.memberIds.length})` : `Чат ${conversation._id.slice(-6)}`;

  const lastMessagePreview = conversation.lastMessage ? '\u{1F512} сообщение' : 'Нет сообщений';

  const timestamp = conversation.lastMessage
    ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <UnstyledButton
      component={Link}
      to={ROUTES.chat(conversation._id) as string}
      p="sm"
      style={{ borderRadius: 'var(--mantine-radius-md)', textDecoration: 'none', color: 'inherit' }}
    >
      <Group wrap="nowrap">
        <Indicator color="gray" position="bottom-end" size={12} offset={4} withBorder>
          <Avatar radius="xl" size="lg" color="blue">
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Indicator>

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" wrap="nowrap">
            <Text fw={500} truncate>
              {displayName}
            </Text>

            {timestamp && (
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {timestamp}
              </Text>
            )}
          </Group>

          <Text size="sm" c="dimmed" truncate>
            {lastMessagePreview}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
