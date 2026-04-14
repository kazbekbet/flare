import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

/** @type {import('typescript-eslint').Config} */
const config = tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Сортировка импортов: ошибка если не отсортированы
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Основной фреймворк: React и NestJS
            ['^react(-dom)?(/.*)?$', '^@nestjs(/.*)?$'],
            // 2. Остальные сторонние библиотеки (не @flare/*, не node:*, не относительные)
            ['^node:', '^(?!@flare)@?\\w'],
            // 3. Внутренние пакеты монорепозитория (@flare/*)
            ['^@flare/'],
            // 4. Относительные импорты (./foo, ../bar)
            ['^\\.'],
            // 5. Стили (*.css, *.scss, *.module.css и т.д.)
            ['\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.mjs', '*.cjs'],
  },
);

export default config;
