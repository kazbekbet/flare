import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './app/providers/index.js';
import { AppRouterProvider } from './app/router/index.js';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

/**
 * Точка входа приложения Flare Web.
 * Монтирует корень React, подключает Mantine-стили, оборачивает роутер в провайдеры.
 */
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <AppRouterProvider />
    </AppProviders>
  </StrictMode>,
);
