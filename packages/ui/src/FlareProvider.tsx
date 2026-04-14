import React from 'react';

import {
  ColorSchemeScript,
  localStorageColorSchemeManager,
  type MantineColorScheme,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import { flareTheme, resolver } from './theme.js';

/**
 * Пропсы компонента FlareProvider.
 *
 * @prop {MantineColorScheme} [colorScheme='auto'] - Начальная цветовая схема.
 *   'auto' — следует системным настройкам пользователя.
 *   Предпочтение сохраняется в localStorage под ключом 'flare-color-scheme'.
 * @prop {React.ReactNode} children - Дочерние компоненты приложения.
 */
export interface FlareProviderProps {
  colorScheme?: MantineColorScheme;
  children: React.ReactNode;
}

/**
 * Менеджер цветовой схемы.
 * Автоматически синхронизирует выбор пользователя с localStorage.
 */
const colorSchemeManager = localStorageColorSchemeManager({
  key: 'flare-color-scheme',
});

/**
 * Корневой провайдер дизайн-системы Flare.
 * Оборачивает приложение в MantineProvider с темой Flare,
 * подключает ColorSchemeScript для SSR-безопасного переключения dark/light
 * и инициализирует систему уведомлений.
 *
 * @param props - Пропсы провайдера.
 * @returns Дерево провайдеров, готовое к рендерингу приложения.
 *
 * @example
 * ```tsx
 * <FlareProvider colorScheme="dark">
 *   <App />
 * </FlareProvider>
 * ```
 */
export function FlareProvider({ colorScheme = 'auto', children }: FlareProviderProps) {
  return (
    <>
      <ColorSchemeScript defaultColorScheme={colorScheme} />
      <MantineProvider
        theme={flareTheme}
        cssVariablesResolver={resolver}
        defaultColorScheme={colorScheme}
        colorSchemeManager={colorSchemeManager}
      >
        <Notifications position="top-right" />
        {children}
      </MantineProvider>
    </>
  );
}
