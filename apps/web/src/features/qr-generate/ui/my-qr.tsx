import { useAppSelector } from '@app/store';
import { selectSession } from '@entities/session';
import { Alert, Paper, Stack, Text, Title } from '@mantine/core';
import { encodeQrPayload } from '@shared/lib';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Экран «Мой QR». Показывает QR-код с payload `{v:1, uid, name}` —
 * другой пользователь сканирует его и добавляет нас в друзья.
 */
export function MyQrCode() {
  const session = useAppSelector(selectSession);

  if (!session.userId || !session.displayName) {
    return <Alert color="yellow">Сначала зарегистрируйтесь — у вас ещё нет профиля.</Alert>;
  }

  const payload = encodeQrPayload({ v: 1, uid: session.userId, name: session.displayName });

  return (
    <Stack gap="md" align="center">
      <Title order={2}>Мой QR-код</Title>
      <Paper p="md" withBorder>
        <QRCodeSVG value={payload} size={256} includeMargin />
      </Paper>
      <Text size="sm" c="dimmed" ta="center" maw={320}>
        Покажите этот код другому пользователю Flare — он отсканирует его и отправит вам запрос в друзья.
      </Text>
    </Stack>
  );
}
