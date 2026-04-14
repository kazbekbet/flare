import { RegisterForm } from '@features/auth-register';
import { Center, Container, Paper } from '@mantine/core';
import { ROUTES } from '@shared/config';

/**
 * Пропсы `AuthPage`.
 *
 * @prop {() => void} [onRegistered] - Вызывается после успешной регистрации (обычно — навигация на `/chats`).
 */
export interface AuthPageProps {
  onRegistered?: () => void;
}

/**
 * Страница регистрации/входа.
 * Показывается неаутентифицированным пользователям.
 */
export function AuthPage({ onRegistered }: AuthPageProps) {
  return (
    <Center mih="100vh" px="md">
      <Container w="100%" maw={420}>
        <Paper p="xl" radius="md" withBorder>
          <RegisterForm onSuccess={onRegistered} />
        </Paper>
      </Container>
    </Center>
  );
}

AuthPage.path = ROUTES.auth;
