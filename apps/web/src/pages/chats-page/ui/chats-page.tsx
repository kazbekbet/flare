import { ActionIcon, Container, Title } from '@mantine/core';
import { ROUTES } from '@shared/config';
import { useNavigate } from '@tanstack/react-router';
import { ChatList } from '@widgets/chat-list';

/**
 * Экран списка чатов.
 * Отображает все переписки текущего пользователя и кнопку добавления друга.
 */
export function ChatsPage() {
  const navigate = useNavigate();

  return (
    <Container py="xl" pos="relative">
      <Title order={2} mb="md">
        Чаты
      </Title>

      <ChatList />

      <ActionIcon
        variant="filled"
        size="xl"
        radius="xl"
        color="blue"
        pos="fixed"
        bottom={24}
        right={24}
        onClick={() => navigate({ to: ROUTES.friends })}
        aria-label="Добавить друга"
      >
        +
      </ActionIcon>
    </Container>
  );
}
