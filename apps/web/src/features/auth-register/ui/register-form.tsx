import React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, PasswordInput, Stack, TextInput, Title } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { z } from 'zod';

import { RegisterDtoSchema } from '@flare/shared';

import { performRegister } from '../model/register.thunk.js';

/**
 * Форма регистрации: displayName + PIN.
 * Схема валидации расширяет `RegisterDtoSchema` — добавляет `pin` (6–12 цифр) и confirm.
 */
const FormSchema = RegisterDtoSchema.pick({ displayName: true })
  .extend({
    pin: z.string().regex(/^\d{6,12}$/, 'PIN должен состоять из 6–12 цифр'),
    pinConfirm: z.string(),
  })
  .refine((v) => v.pin === v.pinConfirm, { path: ['pinConfirm'], message: 'PIN не совпадает' });

type FormValues = z.infer<typeof FormSchema>;

/**
 * Экран регистрации нового пользователя.
 * Генерирует keypair, отправляет на сервер, шифрует приватный ключ PIN-ом.
 *
 * @param props.onSuccess - Коллбек после успешной регистрации (обычно — редирект).
 */
export interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const dispatch = useDispatch();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(FormSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await performRegister({ displayName: values.displayName, pin: values.pin }, dispatch);
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка регистрации');
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="md">
        <Title order={2}>Регистрация в Flare</Title>
        <TextInput
          label="Имя"
          placeholder="Как вас показывать"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <PasswordInput
          label="PIN-код"
          description="Используется для шифрования приватного ключа на устройстве"
          error={errors.pin?.message}
          {...register('pin')}
        />
        <PasswordInput label="Повторите PIN" error={errors.pinConfirm?.message} {...register('pinConfirm')} />
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" loading={isSubmitting}>
          Зарегистрироваться
        </Button>
      </Stack>
    </form>
  );
}
