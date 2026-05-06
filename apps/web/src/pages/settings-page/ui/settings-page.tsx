import { Container, Group, SegmentedControl, Stack, Text, Title, useMantineColorScheme } from '@mantine/core';

/**
 * Экран настроек.
 * Phase 4 — пока реализован только переключатель темы; редактирование профиля
 * и отображение fingerprint появятся в task 28.
 */
export function SettingsPage() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Container py="xl" maw={520}>
      <Stack gap="xl">
        <Title order={2}>Настройки</Title>

        <Stack gap="xs">
          <Group justify="space-between" align="flex-end">
            <Stack gap={2}>
              <Text fw={500}>Тема оформления</Text>
              <Text size="sm" c="dimmed">
                «Системная» подстраивается под настройки устройства.
              </Text>
            </Stack>

            <SegmentedControl
              value={colorScheme}
              onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
              data={[
                { label: 'Светлая', value: 'light' },
                { label: 'Тёмная', value: 'dark' },
                { label: 'Системная', value: 'auto' },
              ]}
            />
          </Group>
        </Stack>

        <Text c="dimmed" size="sm">
          Редактирование профиля и отображение fingerprint — в Phase 4 (task 28).
        </Text>
      </Stack>
    </Container>
  );
}
