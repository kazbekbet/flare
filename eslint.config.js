import boundaries from 'eslint-plugin-boundaries';
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

/**
 * FSD layer boundary rules for apps/web/src.
 * Prevents upward imports: e.g. shared must not import from entities/features/etc.
 */
const FSD_LAYERS = ['app', 'pages', 'features', 'entities', 'shared'];
const FSD_ALLOWED_FROM = {
  app: ['pages', 'features', 'entities', 'shared'],
  pages: ['features', 'entities', 'shared'],
  features: ['entities', 'shared'],
  entities: ['shared'],
  shared: [],
};

export default [
  ...config,
  {
    files: ['apps/server/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-import-type-side-effects': 'off',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': FSD_LAYERS.map((layer) => ({
        type: layer,
        pattern: `apps/web/src/${layer}`,
      })),
      'boundaries/include': ['apps/web/src/**/*'],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: FSD_LAYERS.map((layer) => ({
            from: layer,
            allow: FSD_ALLOWED_FROM[layer],
          })),
        },
      ],
    },
  },
];
