import { useAppSelector } from '@app/store';
import { selectSession } from '@entities/session';
import { ActionIcon, Alert, CopyButton, Group, Paper, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { encodeQrPayload } from '@shared/lib';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Экран «Мой QR». Показывает QR-код с payload `{v:1, uid, name}`,
 * а также текстовый ID для ручного добавления.
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

      <Group w="100%" maw={320} gap="xs">
        <TextInput flex={1} readOnly value={session.userId} label="Мой ID" size="xs" />
        <CopyButton value={session.userId}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Скопировано' : 'Копировать'} withArrow>
              <ActionIcon variant="subtle" mt={22} onClick={copy} color={copied ? 'teal' : 'gray'}>
                {copied ? '✓' : '⎘'}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>

      <Text size="sm" c="dimmed" ta="center" maw={320}>
        Покажите QR-код или отправьте свой ID другому пользователю Flare.
      </Text>
    </Stack>
  );
}
