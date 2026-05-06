import { ActionIcon, Group, Tooltip, useMantineColorScheme } from '@mantine/core';

/**
 * Переключатель цветовой схемы.
 * Использует `useMantineColorScheme` — выбор сохраняется через
 * `localStorageColorSchemeManager`, подключённый в `FlareProvider`.
 *
 * Состоит из трёх icon-кнопок: светлая / тёмная / системная.
 * Активная подсвечивается `variant="filled"`.
 *
 * @prop {'sm' | 'md' | 'lg'} [size='md'] - Размер ActionIcon.
 */
export interface ColorSchemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
}

/** Иконка солнца. */
function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

/** Иконка луны. */
function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

/** Иконка монитора (системная схема). */
function SystemIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

/**
 * Компактный переключатель темы (3 icon-кнопки).
 * Используется на Auth-экране и в правом верхнем углу шапок.
 */
export function ColorSchemeToggle({ size = 'md' }: ColorSchemeToggleProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const variantFor = (scheme: typeof colorScheme) => (colorScheme === scheme ? 'filled' : 'subtle');

  return (
    <Group gap={4} role="radiogroup" aria-label="Цветовая схема">
      <Tooltip label="Светлая" withArrow>
        <ActionIcon
          variant={variantFor('light')}
          size={size}
          radius="xl"
          onClick={() => setColorScheme('light')}
          aria-label="Светлая тема"
          aria-checked={colorScheme === 'light'}
          role="radio"
        >
          <SunIcon />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Тёмная" withArrow>
        <ActionIcon
          variant={variantFor('dark')}
          size={size}
          radius="xl"
          onClick={() => setColorScheme('dark')}
          aria-label="Тёмная тема"
          aria-checked={colorScheme === 'dark'}
          role="radio"
        >
          <MoonIcon />
        </ActionIcon>
      </Tooltip>

      <Tooltip label="Как в системе" withArrow>
        <ActionIcon
          variant={variantFor('auto')}
          size={size}
          radius="xl"
          onClick={() => setColorScheme('auto')}
          aria-label="Системная тема"
          aria-checked={colorScheme === 'auto'}
          role="radio"
        >
          <SystemIcon />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
