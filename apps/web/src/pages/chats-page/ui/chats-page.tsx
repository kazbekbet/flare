import { Container, Text, Title } from '@mantine/core';

/**
 * Заглушка экрана списка чатов.
 * Полноценный список и экран переписки реализуются в Phase 2 (tasks 18, 19).
 */
export function ChatsPage() {
  return (
    <Container py="xl">
      <Title order={2}>Чаты</Title>
      <Text c="dimmed" mt="sm">
        Список переписок появится в Phase 2 — после WebSocket Gateway и Messages-модуля.
      </Text>
    </Container>
  );
}
