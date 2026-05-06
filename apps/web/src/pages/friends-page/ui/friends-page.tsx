import React from 'react';

import { AddByIdForm } from '@features/add-by-id';
import { MyQrCode } from '@features/qr-generate';
import { QrScanner } from '@features/qr-scan';
import { Container, Divider, SegmentedControl, Stack } from '@mantine/core';
import { FriendRequests } from '@widgets/friend-requests';

/** Активная вкладка экрана «Добавить друга». */
type Tab = 'my-qr' | 'scan' | 'by-id';

/**
 * Экран друзей.
 * Верхняя часть — список друзей и входящих запросов.
 * Нижняя часть — переключение между «Мой QR / ID», «Сканировать» и «По ID».
 */
export function FriendsPage() {
  const [tab, setTab] = React.useState<Tab>('my-qr');

  return (
    <Container py="xl" maw={480}>
      <Stack gap="lg">
        <FriendRequests />

        <Divider />

        <SegmentedControl
          fullWidth
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          data={[
            { label: 'Мой QR', value: 'my-qr' },
            { label: 'Сканировать', value: 'scan' },
            { label: 'По ID', value: 'by-id' },
          ]}
        />

        {tab === 'my-qr' && <MyQrCode />}
        {tab === 'scan' && <QrScanner />}
        {tab === 'by-id' && <AddByIdForm />}
      </Stack>
    </Container>
  );
}
