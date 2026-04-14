import config from '@flare/eslint-config';

/**
 * Корневой ESLint-конфиг монорепозитория.
 *
 * Override для `apps/server/**`: `@typescript-eslint/consistent-type-imports`
 * намеренно отключён — правило не понимает семантику NestJS DI
 * (`emitDecoratorMetadata`). Если автофикс превращает инжектируемый класс
 * в `import type`, TypeScript стирает референс и в рантайме падает
 * `Nest can't resolve dependencies`.
 *
 * ESLint 9 flat-config резолвит конфигурацию от CWD, поэтому override
 * здесь, а не в `apps/server/eslint.config.js` — иначе lefthook (который
 * запускает eslint из корня) его не видит.
 */
export default [
  ...config,
  {
    files: ['apps/server/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
];
