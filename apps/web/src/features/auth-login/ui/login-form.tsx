import React from 'react';

import { useAppDispatch } from '@app/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { performLogin } from '../model/login.thunk';

/**
 * Схема валидации формы входа.
 * displayName + PIN (6-12 цифр).
 */
const FormSchema = z.object({
  displayName: z.string().min(1, 'Введите имя').max(32),
  pin: z.string().regex(/^\d{6,12}$/, 'PIN должен состоять из 6–12 цифр'),
});

type FormValues = z.infer<typeof FormSchema>;

/**
 * Пропсы `LoginForm`.
 *
 * @prop {() => void} [onSuccess] - Коллбек после успешного входа (обычно — редирект).
 */
export interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * Форма входа: displayName + PIN.
 * Расшифровывает приватный ключ из IndexedDB, подписывает challenge и отправляет на сервер.
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const dispatch = useAppDispatch();
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);

    try {
      await performLogin({ displayName: values.displayName, pin: values.pin }, dispatch);
      onSuccess?.();
    } catch (e) {
      if (e instanceof Error && e.message.includes('Decryption failed')) {
        setError('Неверный PIN-код');
      } else {
        setError(e instanceof Error ? e.message : 'Ошибка входа');
      }
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <Title order={2}>Вход в Flare</Title>

        <TextInput
          label="Имя"
          placeholder="Ваше отображаемое имя"
          error={errors.displayName?.message}
          {...register('displayName')}
        />

        <PasswordInput
          label="PIN-код"
          description="PIN, указанный при регистрации"
          error={errors.pin?.message}
          {...register('pin')}
        />

        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}

        <Button type="submit" loading={isSubmitting}>
          Войти
        </Button>
      </Stack>
    </form>
  );
}
