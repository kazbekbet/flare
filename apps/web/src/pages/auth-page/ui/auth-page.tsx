import { useState } from 'react';

import { useAuthStartupContext } from '@app/router';
import { LoginForm } from '@features/auth-login';
import { RegisterForm } from '@features/auth-register';
import { Box, Center, Container, Paper, SegmentedControl, Stack } from '@mantine/core';
import { ROUTES } from '@shared/config';
import { ColorSchemeToggle } from '@shared/ui/color-scheme-toggle';

import classes from './auth-page.module.css';

/** Режим страницы аутентификации. */
type AuthMode = 'register' | 'login';

/**
 * Пропсы `AuthPage`.
 *
 * @prop {() => void} [onAuthenticated] - Вызывается после успешной регистрации или входа (обычно — навигация на `/chats`).
 */
export interface AuthPageProps {
  onAuthenticated?: () => void;
}

/**
 * Страница регистрации/входа.
 * Показывается неаутентифицированным пользователям.
 *
 * Содержит:
 * - переливающийся фон (CSS-анимация в `auth-page.module.css`),
 * - переключатель цветовой схемы в правом верхнем углу,
 * - SegmentedControl + форму регистрации/входа.
 */
export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { hasKey } = useAuthStartupContext();
  const [mode, setMode] = useState<AuthMode>(hasKey ? 'login' : 'register');

  return (
    <Box className={classes.stage}>
      <Box pos="absolute" top={16} right={16} style={{ zIndex: 5 }}>
        <ColorSchemeToggle size="md" />
      </Box>

      <Center mih="100vh" px="md">
        <Container w="100%" maw={420}>
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="lg">
              <SegmentedControl
                value={mode}
                onChange={(v) => setMode(v as AuthMode)}
                fullWidth
                data={[
                  { label: 'Регистрация', value: 'register' },
                  { label: 'Вход', value: 'login' },
                ]}
              />

              {mode === 'register' ? (
                <RegisterForm onSuccess={onAuthenticated} />
              ) : (
                <LoginForm onSuccess={onAuthenticated} />
              )}
            </Stack>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}

AuthPage.path = ROUTES.auth;
