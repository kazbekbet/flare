import React from 'react';

import { Provider as ReduxProvider } from 'react-redux';

import { FlareProvider } from '@flare/ui';

import { store } from '../store/index.js';

/**
 * Пропсы `AppProviders`.
 *
 * @prop {React.ReactNode} children - Дочернее дерево (обычно — router).
 */
export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Корневой композит провайдеров: RTK-store + Mantine-тема (FlareProvider).
 * Роутер не включён сюда — его точка входа знает о себе больше и инициализируется отдельно в `main.tsx`.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <FlareProvider>{children}</FlareProvider>
    </ReduxProvider>
  );
}
