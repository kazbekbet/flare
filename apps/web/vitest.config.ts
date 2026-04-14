import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(rootDir, 'src');

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
      '@app': path.resolve(srcDir, 'app'),
      '@pages': path.resolve(srcDir, 'pages'),
      '@widgets': path.resolve(srcDir, 'widgets'),
      '@features': path.resolve(srcDir, 'features'),
      '@entities': path.resolve(srcDir, 'entities'),
      '@shared': path.resolve(srcDir, 'shared'),
    },
  },
});
