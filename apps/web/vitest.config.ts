import { defineConfig } from 'vitest/config';

/**
 * Конфигурация Vitest — изолирована от Vite-билда,
 * чтобы не грузить PWA-плагин в тестах.
 * JSDOM-окружение, глобальные matcher-ы jest-dom через setup-файл.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  resolve: {
    alias: {
      '@app': '/src/app',
      '@pages': '/src/pages',
      '@widgets': '/src/widgets',
      '@features': '/src/features',
      '@entities': '/src/entities',
      '@shared': '/src/shared',
    },
  },
});
