import { Container, Text, Title } from '@mantine/core';

/**
 * Заглушка экрана настроек.
 * Полноценные настройки (тема, аватар, fingerprint, logout) реализуются в Phase 4 (task 28).
 */
export function SettingsPage() {
  return (
    <Container py="xl">
      <Title order={2}>Настройки</Title>
      <Text c="dimmed" mt="sm">
        Тема dark/light, редактирование профиля и отображение fingerprint — в Phase 4.
      </Text>
    </Container>
  );
}
