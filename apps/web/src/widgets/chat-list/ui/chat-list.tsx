import { useGetConversationsQuery } from '@entities/conversation';
import { Skeleton, Stack, Text } from '@mantine/core';

import { ChatListItem } from './chat-list-item';

/**
 * Виджет списка чатов.
 * Загружает переписки текущего пользователя и отображает их в виде списка.
 */
export function ChatList() {
  const { data: conversations, isLoading } = useGetConversationsQuery();

  if (isLoading) {
    return (
      <Stack gap="sm">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={60} radius="md" />
        ))}
      </Stack>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <Text c="dimmed" ta="center" mt="xl">
        У вас пока нет переписок. Добавьте друга, чтобы начать общение.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      {conversations.map((conversation) => (
        <ChatListItem key={conversation._id} conversation={conversation} />
      ))}
    </Stack>
  );
}
