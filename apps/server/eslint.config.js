import config from '@flare/eslint-config';

/**
 * ESLint-конфиг сервера.
 *
 * `@typescript-eslint/consistent-type-imports` намеренно отключён —
 * правило не понимает семантику NestJS DI (emitDecoratorMetadata).
 * Если автофикс превращает инжектируемый класс в `import type`,
 * TypeScript стирает референс, и в рантайме `Nest can't resolve dependencies`.
 */
export default [
  ...config,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
];
