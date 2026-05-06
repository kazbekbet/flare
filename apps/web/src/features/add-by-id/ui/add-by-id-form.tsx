import React from 'react';

import { useSendFriendRequestMutation } from '@entities/friendship';
import { Alert, Button, Stack, TextInput, Title } from '@mantine/core';

/**
 * Форма добавления друга по ID.
 * Пользователь вставляет ID друга и отправляет запрос дружбы.
 */
export function AddByIdForm() {
  const [sendRequest, { isLoading }] = useSendFriendRequestMutation();
  const [friendId, setFriendId] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = friendId.trim();

    if (!trimmed) {
      setError('Введите ID пользователя');
      return;
    }

    try {
      await sendRequest({ addresseeId: trimmed }).unwrap();

      setSuccess(true);
      setFriendId('');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Не удалось отправить запрос';

      setError(message);
    }
  };

  return (
    <Stack gap="md" align="center" component="form" onSubmit={handleSubmit}>
      <Title order={2}>Добавить по ID</Title>

      <TextInput
        w="100%"
        maw={320}
        placeholder="Вставьте ID друга"
        value={friendId}
        onChange={(e) => setFriendId(e.currentTarget.value)}
        disabled={isLoading}
      />

      <Button type="submit" loading={isLoading} disabled={!friendId.trim()}>
        Отправить запрос
      </Button>

      {success && (
        <Alert color="green" w="100%" maw={320}>
          Запрос дружбы отправлен!
        </Alert>
      )}

      {error && (
        <Alert color="red" w="100%" maw={320}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
