import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';

/**
 * Палитра цветов Slate (10 оттенков от светлого к тёмному).
 * Используется как основной цвет бренда Flare.
 * Тёмный конец (#0f172a) совпадает с theme_color PWA-манифеста.
 */
const slate: MantineColorsTuple = [
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#475569',
  '#334155',
  '#1e293b',
  '#0f172a',
  '#020617',
];

/**
 * Кастомная тема Mantine для приложения Flare.
 * Переопределяет только токены дизайн-системы — без кастомного CSS.
 * Передаётся в MantineProvider через FlareProvider.
 */
export const flareTheme = createTheme({
  primaryColor: 'slate',
  colors: {
    slate,
  },
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  other: {
    /** Цвет темы для PWA-манифеста и мета-тега theme-color */
    themeColor: '#0f172a',
  },
});

/**
 * Резолвер CSS-переменных Flare для MantineProvider.
 * Определяет кастомные токены, доступные через `var(--flare-*)` в CSS.
 * Автоматически адаптируется к light/dark режиму.
 *
 * @param theme - Текущая тема Mantine (с применёнными overrides).
 * @returns Объект с переменными для светлой и тёмной схем.
 */
export const resolver: CSSVariablesResolver = (theme) => ({
  variables: {
    '--flare-primary': theme.colors.slate[8],
    '--flare-primary-hover': theme.colors.slate[7],
    '--flare-bg': theme.colors.slate[9],
  },
  light: {
    '--flare-surface': theme.colors.slate[0],
    '--flare-text': theme.colors.slate[9],
  },
  dark: {
    '--flare-surface': theme.colors.slate[8],
    '--flare-text': theme.colors.slate[0],
  },
});
