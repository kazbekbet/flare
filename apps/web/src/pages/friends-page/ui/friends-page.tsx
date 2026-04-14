import React from 'react';

import { Container, SegmentedControl, Stack } from '@mantine/core';

import { MyQrCode } from '../../../features/qr-generate/index.js';
import { QrScanner } from '../../../features/qr-scan/index.js';

/** Активная вкладка экрана «Друзья». */
type Tab = 'my-qr' | 'scan';

/**
 * Экран добавления друзей. Переключение между «Мой QR» и «Сканировать».
 */
export function FriendsPage() {
  const [tab, setTab] = React.useState<Tab>('my-qr');

  return (
    <Container py="xl" maw={480}>
      <Stack gap="lg">
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          data={[
            { label: 'Мой QR', value: 'my-qr' },
            { label: 'Сканировать', value: 'scan' },
          ]}
        />
        {tab === 'my-qr' ? <MyQrCode /> : <QrScanner />}
      </Stack>
    </Container>
  );
}
