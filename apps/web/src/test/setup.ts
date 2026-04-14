import { vi } from 'vitest';

import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

/**
 * В jsdom `fetch` требует абсолютный URL.
 * RTK Query в продакшене ходит в `/api/*` через Vite-прокси, но в тестах
 * подставляем абсолютную базу до того, как модуль `@shared/config` прочитает env.
 */
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
