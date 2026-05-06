import { useAppSelector } from '@app/store';
import { useAcceptFriendMutation, useDeclineFriendMutation, useGetFriendsQuery } from '@entities/friendship';
import { selectSession } from '@entities/session';
import { Alert, Badge, Button, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';

/**
 * Виджет списка друзей и входящих запросов дружбы.
 * Показывает принятых друзей и запросы с кнопками «Принять» / «Отклонить».
 */
export function FriendRequests() {
  const session = useAppSelector(selectSession);
  const { data: friends, isLoading, error } = useGetFriendsQuery();
  const [accept, { isLoading: accepting }] = useAcceptFriendMutation();
  const [decline, { isLoading: declining }] = useDeclineFriendMutation();

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton h={60} />
        <Skeleton h={60} />
      </Stack>
    );
  }

  if (error) {
    return <Alert color="red">Не удалось загрузить список друзей</Alert>;
  }

  if (!friends || friends.length === 0) {
    return (
      <Text c="dimmed" ta="center">
        Друзей пока нет. Добавьте кого-нибудь!
      </Text>
    );
  }

  const incoming = friends.filter((f) => f.status === 'PENDING' && f.addresseeId === session.userId);

  const outgoing = friends.filter((f) => f.status === 'PENDING' && f.requesterId === session.userId);

  const accepted = friends.filter((f) => f.status === 'ACCEPTED');

  return (
    <Stack gap="md">
      {incoming.length > 0 && (
        <>
          <Title order={4}>Входящие запросы</Title>
          {incoming.map((f) => (
            <FriendRequestCard
              key={f.id}
              label={f.requesterId}
              onAccept={() => accept(f.id)}
              onDecline={() => decline(f.id)}
              loading={accepting || declining}
            />
          ))}
        </>
      )}

      {outgoing.length > 0 && (
        <>
          <Title order={4}>Исходящие запросы</Title>
          {outgoing.map((f) => (
            <Paper key={f.id} p="sm" withBorder>
              <Group justify="space-between">
                <Text size="sm" truncate maw={200}>
                  {f.addresseeId}
                </Text>
                <Badge color="yellow" variant="light">
                  Ожидание
                </Badge>
              </Group>
            </Paper>
          ))}
        </>
      )}

      {accepted.length > 0 && (
        <>
          <Title order={4}>Друзья</Title>
          {accepted.map((f) => {
            const friendId = f.requesterId === session.userId ? f.addresseeId : f.requesterId;

            return (
              <Paper key={f.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Text size="sm" truncate maw={200}>
                    {friendId}
                  </Text>
                  <Badge color="green" variant="light">
                    Друг
                  </Badge>
                </Group>
              </Paper>
            );
          })}
        </>
      )}
    </Stack>
  );
}

/**
 * Карточка входящего запроса дружбы.
 */
function FriendRequestCard({
  label,
  onAccept,
  onDecline,
  loading,
}: {
  label: string;
  onAccept: () => void;
  onDecline: () => void;
  loading: boolean;
}) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between">
        <Text size="sm" truncate maw={160}>
          {label}
        </Text>
        <Group gap="xs">
          <Button size="xs" color="green" onClick={onAccept} loading={loading}>
            Принять
          </Button>
          <Button size="xs" variant="subtle" color="red" onClick={onDecline} loading={loading}>
            Отклонить
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
