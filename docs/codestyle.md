# Flare — Code Style Guide

> Все правила применяются автоматически через ESLint + Prettier + Lefthook.
> Этот документ описывает договорённости, которые нельзя выразить в конфиге.

---

## Форматирование (Prettier)

| Правило         | Значение                        |
| --------------- | ------------------------------- |
| Кавычки         | одинарные (`singleQuote: true`) |
| Точки с запятой | обязательны (`semi: true`)      |
| Trailing comma  | везде (`trailingComma: 'all'`)  |
| Ширина строки   | 120 символов                    |
| Отступ          | 2 пробела                       |

---

## Импорты

Сортировка и разделение — через `eslint-plugin-simple-import-sort`. Порядок групп (разделяются пустой строкой):

```ts
// 1. Основной фреймворк
import React from 'react';
import { Controller } from '@nestjs/common';

// 2. Остальные сторонние библиотеки
import { z } from 'zod';
import { MantineProvider } from '@mantine/core';

// 3. Внутренние пакеты монорепозитория
import { User } from '@flare/shared';
import { FlareProvider } from '@flare/ui';

// 4. Относительные импорты
import { MyComponent } from './MyComponent';
import { helper } from '../utils/helper';

// 5. Стили
import './styles.css';
```

**Type-only импорты** — всегда inline:

```ts
// правильно
import { type User, getUser } from '@flare/shared';

// неправильно
import type { User } from '@flare/shared';
import { getUser } from '@flare/shared';
```

---

## Пустые строки внутри функций

Тело функции разбивается пустыми строками на смысловые группы:

1. **Объявления** — переменные и константы
2. **Действия** — вызовы функций, вычисления, мутации
3. **Возврат** — `return`

```ts
// правильно
const keypair = generateIdentityKeypair();
const dto = { displayName, publicKey: keypair.publicKey };
const result = await dispatch(authApi.endpoints.register.initiate(dto)).unwrap();

await storePrivateKey(keypair.privateKey, args.pin);
dispatch(authenticated({ userId: result.userId, displayName, publicKey: keypair.publicKey }));

return result.userId;

// неправильно — всё слитно
const keypair = generateIdentityKeypair();
const dto = { displayName, publicKey: keypair.publicKey };
const result = await dispatch(authApi.endpoints.register.initiate(dto)).unwrap();
await storePrivateKey(keypair.privateKey, args.pin);
dispatch(authenticated({ userId: result.userId, displayName, publicKey: keypair.publicKey }));
return result.userId;
```

Prettier пустые строки не добавляет — расставляются вручную (или LLM).

---

## TypeScript

- Строгий режим (`strict: true`) во всех пакетах
- `any` — предупреждение линтера, избегать
- Все публичные типы и интерфейсы обязательно документируются JSDoc

---

## JSDoc

Документирование — единым блоком над объявлением. Для свойств — теги `@prop`, для функций — `@param` и `@returns`.

**Интерфейсы и типы:**

```ts
/**
 * Краткое описание интерфейса.
 * Дополнительный контекст при необходимости.
 *
 * @prop {string} id - Уникальный идентификатор.
 * @prop {string} name - Отображаемое имя.
 * @prop {Date} [createdAt] - Дата создания (опционально).
 */
export interface User {
  id: string;
  name: string;
  createdAt?: Date;
}
```

**Функции:**

````ts
/**
 * Краткое описание функции.
 *
 * @param plaintext - Исходный текст сообщения.
 * @param recipientPublicKey - Base64-encoded X25519 публичный ключ получателя.
 * @returns Объект с зашифрованным содержимым и nonce.
 *
 * @example
 * ```ts
 * const { ciphertext, nonce } = encryptMessage('hello', recipientKey, senderKey);
 * ```
 */
export function encryptMessage(plaintext: string, recipientPublicKey: string): EncryptedPayload {
  // ...
}
````

**Enums:**

```ts
/**
 * Краткое описание enum.
 *
 * @enum {string}
 * @prop VALUE_A - Описание значения A.
 * @prop VALUE_B - Описание значения B.
 */
export enum MyEnum {
  VALUE_A = 'VALUE_A',
  VALUE_B = 'VALUE_B',
}
```

### Проверка перед коммитом

После завершения любой задачи — до коммита — прогнать вручную:

```bash
pnpm prettier --write "**/*.{ts,tsx,js,json}"
pnpm eslint --fix "**/*.{ts,tsx}"
pnpm turbo run test
pnpm turbo run build
```

Не ждать, пока Lefthook отклонит коммит или пуш. Хуки — страховка, не основной инструмент.

---

### Актуальность JSDoc

JSDoc обновляется **одновременно** с изменением сигнатуры — в том же коммите, в той же правке. Устаревший JSDoc хуже отсутствующего: он вводит в заблуждение.

Что считается изменением сигнатуры:

- добавление, удаление или переименование параметра / свойства
- изменение типа параметра / свойства
- изменение возвращаемого типа функции
- изменение опциональности (`?`) поля

---

## Pre-commit / Pre-push (Lefthook)

**pre-commit** — запускается на staged файлах, последовательно:

1. `prettier --write` — форматирование
2. `eslint --fix` — сортировка импортов, type-imports

**pre-push** — запускается параллельно:

- `turbo run build` — typecheck через TypeScript компилятор
- `turbo run test` — юнит-тесты

Прогоняется только над изменёнными относительно предыдущего коммита пакетами (`--filter=[HEAD^1]`).

---

## Именование

| Сущность                 | Стиль                                         | Пример                          |
| ------------------------ | --------------------------------------------- | ------------------------------- |
| Переменные, функции      | camelCase                                     | `getUserById`                   |
| Классы, интерфейсы, типы | PascalCase                                    | `UserService`, `SendMessageDto` |
| Enums                    | PascalCase (название) + UPPER_CASE (значения) | `MessageType.TEXT`              |
| Файлы (TS/TSX)           | kebab-case                                    | `chat-screen.tsx`               |
| Константы модуля         | UPPER_SNAKE_CASE                              | `MAX_MESSAGE_LENGTH`            |
| Приватные поля класса    | camelCase с подчёркиванием                    | `_socket`                       |
| Неиспользуемые аргументы | префикс `_`                                   | `(_event) => {}`                |

---

## Структура пакетов

Каждый пакет монорепозитория:

- экспортирует всё через `src/index.ts`
- имеет собственный `tsconfig.json`, расширяющий `@flare/tsconfig`
- имеет собственный `eslint.config.js` или наследует корневой
- собирается командой `tsc` в `dist/`
