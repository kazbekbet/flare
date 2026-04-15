# Flare — Декомпозиция задач

> **Стек фронта:** Mantine UI + минимум кастомных стилей + dark/light тема из настроек  
> **Всего задач:** 31 · **Фаз:** 4 + Desktop UI  
> **Версии:** NestJS (latest) · React 19 · все зависимости — последние стабильные на момент старта

---

## Phase 0 — Монорепозиторий и инфраструктура

**Цель:** рабочая основа, в которую можно сразу начать писать код.

| #   | Статус | Задача                                            | Детали                                                                                                                                                                                                                                                                          |
| --- | ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [x]    | **Turborepo + pnpm workspaces**                   | `apps/web`, `apps/server`, `packages/shared`, `packages/ui`, `packages/config/*`. `turbo.json` pipeline: build → test → lint.                                                                                                                                                   |
| 2   | [x]    | **Config-пакеты (tsconfig, eslint, prettier)**    | `packages/config/tsconfig` — базовый strict tsconfig. `packages/config/eslint` — flat config. `packages/config/prettier` — общие правила. Все app/package extends этих конфигов.                                                                                                |
| 3   | [x]    | **`@flare/shared` — типы, DTO, Zod-схемы**        | TypeScript типы (User, Message, Conversation, Friendship), Zod-схемы для DTO (SendMessageDto, RegisterDto и др.), общие enum-ы (MessageType, FriendshipStatus). Переиспользуется на клиенте и сервере.                                                                          |
| 4   | [x]    | **`@flare/ui` — Mantine + тема dark/light**       | `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`. MantineProvider с кастомной темой Flare (цвета, радиусы, шрифты). Dark/light через `ColorSchemeScript` + `useColorScheme`. Тема хранится в localStorage. Только переопределение токенов — никакого кастомного CSS. |
| 5   | [x]    | **Docker-compose: MongoDB (single node) + MinIO** | На старте — простой `mongo:latest` без Replica Set для быстрого запуска. `minio` (порт 9000/9001). `.env.example`. Replica Set добавить отдельной задачей (#7) когда понадобятся транзакции Mongoose.                                                                           |

### Тесты Phase 0

- Проверить что `turbo run build` проходит для всех пакетов
- Unit-тесты конфига: eslint/prettier не ломают синтаксис примеров кода
- Smoke-тест темы: MantineProvider рендерится в dark и light без ошибок

---

## Phase 1 — Foundation ✅

**Цель:** работающий auth, регистрация по keypair, добавление друзей по QR. **Закрыто.**

### Архитектурные решения, принятые по ходу Phase 1

- **Joi для ENV + Zod для DTO.** Joi нативно интегрируется с `@nestjs/config.validationSchema`. Zod-схемы DTO живут в `@flare/shared` и переиспользуются: фронт — `zodResolver` в RHF, бэк — `createZodDto` + глобальный `ZodValidationPipe` через `APP_PIPE`.
- **Swagger через `nestjs-zod` v5.** `patchNestJsSwagger` удалён — используется `cleanupOpenApiDoc(createDocument(...))`. UI на `/docs`.
- **FSD на фронте** с публичным API через `index.ts` каждого слайса и алиасами `@app/@pages/@widgets/@features/@entities/@shared`.
- **RTK Query с первого дня** (а не с Phase 2, как было в исходном плане). `createApi` в `shared/api/base-api.ts` + `injectEndpoints` в каждом `entities/*/api` и `features/*/api`. JWT через `prepareHeaders` из `session.accessToken`, 401 → `window`-event.
- **Server — ESM + NodeNext.** Shared-пакет ESM, бесшовный interop. В `apps/server` relative-импорты с явным `.js` (требование Node ESM рантайма).
- **ESLint override для `apps/server/**`** в корневом `eslint.config.js`: `consistent-type-imports` отключён. Автофикс превращал injected-классы (`ConfigService`, `JwtService`, `UsersService`, …) в `import type`, что ломало `emitDecoratorMetadata` → Nest не мог разрешить DI в рантайме.
- **MongoDB Replica Set с self-init healthcheck** в docker-compose — отдельного init-контейнера не требуется.

### Backend

| #   | Статус | Задача                                     | Детали                                                                                                                                                                                                                                                                                                                                    |
| --- | ------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | [x]    | **NestJS scaffold (latest)**               | ConfigModule (Joi-валидация ENV), Helmet, ThrottlerModule, Pino (nestjs-pino). Global exception filter, transform interceptor. Структура: `src/modules/`, `src/common/`. Swagger (`/docs`) + Zod-DTO через `nestjs-zod`.                                                                                                                                                                  |
| 7   | [x]    | **Mongoose схемы + индексы + Replica Set** | 6 коллекций: `users`, `sessions` (TTL expireAfterSeconds:0), `presences` (TTL 35s), `friendships` (compound unique), `conversations` (memberIds index, lastMessage денормализация), `messages` (conversationId+\_id composite). Здесь же — поднять MongoDB Replica Set в docker-compose (нужен для транзакций при создании conversation). |
| 8   | [x]    | **Auth модуль**                            | `POST /auth/register` — displayName + publicKey → userId + accessToken + httpOnly refreshToken. `POST /auth/refresh` — ротация через Session (jti). `POST /auth/logout`. `JwtAuthGuard` (HTTP) и `WsJwtGuard` (WebSocket). Access token 15min, refresh 7d.                                                                                |
| 9   | [x]    | **Users модуль**                           | `GET /users/me`, `PATCH /users/me` (displayName, avatarUrl, fcmToken). `GET /users/:id/public-key` — получить публичный ключ для E2E.                                                                                                                                                                                                     |
| 10  | [x]    | **Friends модуль**                         | `POST /friends/request`, `PATCH /friends/:id/accept` (+ автосоздание Conversation DIRECT), `PATCH /friends/:id/decline`, `GET /friends`. Socket events: `friend:request`, `friend:accepted`.                                                                                                                                              |

### Frontend

| #   | Статус | Задача                                                  | Детали                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | [x]    | **React PWA scaffold**                                  | Vite + **React 19** + TypeScript (все либы — последние стабильные). `vite-plugin-pwa` (autoUpdate, NetworkFirst для /api/\*). TanStack Router (роуты: `/auth`, `/chats`, `/chats/:id`, `/friends`, `/settings`). RTK store. `@flare/ui` MantineProvider с ColorSchemeScript. Web App Manifest (name: Flare, display: standalone, theme_color: #0f172a). Архитектура — Feature-Sliced Design (`app / pages / widgets / features / entities / shared`). |
| 12  | [x]    | **Auth feature: keypair, регистрация, PIN + IndexedDB** | `generateIdentityKeypair()` из @flare/shared/crypto. Экран регистрации (Mantine TextInput + PIN-ввод). `storePrivateKey()` — AES-GCM (PBKDF2 из PIN) → idb-keyval. `loadPrivateKey()` при разблокировке. RTK `sessionSlice` (userId, accessToken, isUnlocked, privateKey). Protected routes.                                                                           |
| 13  | [x]    | **QR feature: генерация + сканирование**                | Экран «Мой QR» — `qrcode.react`, payload `{v:1, uid, name}` (Zod-валидация). Экран «Сканировать» — `html5-qrcode`, парсинг payload → GET /users/:id/public-key → POST /friends/request. Обработка ошибок (камера, невалидный QR).                                                                                                                 |

### Тесты Phase 1

**Backend (Jest + Supertest):**

- Auth: register → получить accessToken, refresh → новый token, logout → инвалидация
- Users: GET /users/:id/public-key возвращает корректный publicKey
- Friends: request → accept → conversation создаётся автоматически; decline → conversation не создаётся
- Guards: защищённые маршруты возвращают 401 без токена

**Frontend (Vitest + Testing Library):**

- Генерация keypair: publicKey и privateKey — валидный Base64
- storePrivateKey / loadPrivateKey: сохранить с PIN → расшифровать с тем же PIN → совпадает
- QR payload: парсинг валидного и невалидного JSON
- Protected route редиректит на /auth если нет accessToken

---

## Phase 2 — Core Messaging

**Цель:** полноценный E2E-зашифрованный чат в реальном времени.

| #   | Статус | Задача                                         | Детали                                                                                                                                                                                                                                                                                                  |
| --- | ------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33  | [ ]    | **Auth login + зашифрованный бэкап ключа (backend)** | `POST /auth/login` — `{ displayName, signature, timestamp }`: найти юзера по displayName, верифицировать nacl-подпись через publicKey из БД, timestamp не старше 60с (защита от replay). Выдать токены как в register. `POST /users/me/key-backup` — принять `{ encryptedBlob: string }` (AES-GCM приватного ключа, зашифрованного PIN-ом на клиенте), сохранить в User-документе. `GET /users/me/key-backup` — вернуть `encryptedBlob`. Оба эндпоинта за JwtAuthGuard. |
| 34  | [ ]    | **`signChallenge` / `verifyChallenge` в `@flare/shared`** | `signChallenge(privateKeyB64: string, timestamp: number): string` — `nacl.sign.detached(encode(timestamp), privateKey)` → Base64. `verifyChallenge(publicKeyB64: string, signatureB64: string, timestamp: number): boolean`. Unit-тесты: sign → verify = true; подделанная подпись = false; timestamp > 60s = false. |
| 35  | [ ]    | **Auth startup flow + Login feature (frontend)** | При старте приложения: `POST /auth/refresh` (cookie) → успех → dispatch `accessTokenRefreshed` → `/chats`. Провал → проверить IndexedDB: ключ есть → экран PIN-входа (`auth-login` feature: ввод PIN → `loadPrivateKey` → `signChallenge` → `POST /auth/login` → dispatch `authenticated` → `/chats`); ключ отсутствует → экран регистрации. После успешной регистрации на новом устройстве — `POST /users/me/key-backup` с зашифрованным blob. При PIN-входе на новом устройстве (IndexedDB пуст, но cookie протухла): `GET /users/me/key-backup` → расшифровать blob PIN-ом → восстановить keypair в IndexedDB. `AuthPage` — переключатель «Регистрация / Вход». |
| 14  | [ ]    | **WebSocket Gateway + presence heartbeat**     | `ChatGateway` (OnGatewayConnection/Disconnect). При connect: WsJwtGuard, upsert Presence, `socket.join(user:id + conv:id*N)`. Heartbeat event каждые 30с → upsert Presence.updatedAt. `message:send` handler сохраняет и emit в conv:room.                                                              |
| 15  | [ ]    | **Conversations + Messages модули (backend)**  | `GET /conversations` — список по memberIds, сортировка по lastMessage.createdAt. `GET /conversations/:id/messages?cursor=&limit=50` — cursor-based через ObjectId ($lt, sort \_id:-1). При создании сообщения: updateOne `Conversation.lastMessage`. Транзакция при создании conversation + membership. |
| 16  | [ ]    | **E2E crypto в `@flare/shared`**               | `generateIdentityKeypair()`. `encryptMessage(plaintext, recipientPubKey, senderPrivKey) → {ciphertext, nonce}`. `decryptMessage(...)`. `encryptMediaKey / decryptMediaKey`. `encryptMedia(bytes, key)` через `nacl.secretbox`. Unit-тесты (vitest).                                                     |
| 17  | [ ]    | **Socket.io client + RTK listener middleware** | `socketClient.ts` — singleton с `auth: {token}`. `socketMiddleware.ts` — диспатч actions: `message:new → messagesSlice.addMessage`, `friend:request → friendsSlice`, `presence:change → uiSlice`. Реконнект + flush offline queue.                                                                      |
| 18  | [ ]    | **Экран списка чатов**                         | RTK Query для GET /conversations. Mantine Stack + элемент чата (аватар, displayName, «🔒 сообщение», timestamp). Индикатор online (Mantine Indicator). Кнопка добавления друга.                                                                                                                         |
| 19  | [ ]    | **Экран переписки + отправка сообщений**       | Список сообщений (scroll-to-bottom). Message bubbles (Mantine Paper, своё/чужое). TextInput + Button. При отправке: `encryptMessage()` → `socket.emit('message:send')`. При получении: `decryptMessage()` → plaintext. Статусы sent/delivered/read. Mantine Skeleton при загрузке.                      |
| 20  | [ ]    | **Статусы доставки и прочтения**               | Backend: `deliveredAt` при socket connect, `readAt` bulk update при открытии чата. Socket events: `message:delivered`, `message:read` → emit отправителю. Frontend: RTK обновляет статус, UI показывает ✓/✓✓.                                                                                           |

### Тесты Phase 2

**Backend (Jest):**

- E2E crypto (shared): encrypt → decrypt возвращает исходный plaintext; decrypt с неверным ключом бросает ошибку
- WebSocket Gateway: connect с валидным JWT → Presence создаётся; disconnect → удаляется
- Messages: cursor-пагинация возвращает правильную страницу; `lastMessage` обновляется после отправки
- Статусы: `deliveredAt` проставляется при подключении получателя, `readAt` при открытии чата

**Frontend (Vitest + Testing Library):**

- socketMiddleware: мок socket.emit('message:new') → state.messages обновляется
- ChatList: рендерит список чатов из RTK store, показывает «🔒 сообщение»
- ChatScreen: отправка текста вызывает encryptMessage и socket.emit; входящее сообщение дешифруется и отображается

---

## Phase 3 — Media + Push + PWA

**Цель:** изображения, push-уведомления, полноценный PWA.

| #   | Статус | Задача                                     | Детали                                                                                                                                                                                                                                                                                                                                                        |
| --- | ------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21  | [ ]    | **Media модуль backend**                   | `POST /media/upload-url` — presigned PUT URL в MinIO (TTL 5min) + ключ объекта. `GET /media/:key/download-url` — presigned GET URL. Валидация типа файла (image/\*). Сервер не видит blob — только presigned URL.                                                                                                                                             |
| 22  | [ ]    | **Media upload frontend**                  | Mantine FileInput / drag-drop. `browser-image-compression` — сжатие. Генерация симметричного ключа `nacl.randomBytes(32)`. `nacl.secretbox` шифрует bytes. POST /media/upload-url → PUT blob по presigned URL. `nacl.box` шифрует ключ для получателя. Message type=IMAGE с media.{url, mediaKey, nonce}. При отображении: download-url → decrypt → blob URL. |
| 23  | [ ]    | **FCM сервер: firebase-admin + Agenda.js** | `firebase-admin` из ENV (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY). `sendPush()` — FCM с body «🔒 Зашифрованное сообщение». Agenda.js: `agenda.define('send-push')` — проверяет presence, если offline → sendPush(). В handleMessage: `agenda.schedule('in 2 seconds', ...)`. Коллекция `jobs` в MongoDB.                                                    |
| 24  | [ ]    | **FCM клиент + Service Worker**            | `getToken(messaging, {vapidKey})` при старте → PATCH /users/me {fcmToken}. `public/firebase-messaging-sw.js` — `onBackgroundMessage` показывает notification. `notificationclick` → `clients.openWindow(url)`. Запрос Permission через Mantine Notification.                                                                                                  |
| 25  | [ ]    | **Offline queue (IndexedDB + SW flush)**   | При socket disconnect — сообщения в idb-keyval (`offline-queue`). При reconnect — flush по порядку + очистка. Кэш последних 50 сообщений каждого чата в IndexedDB. SW workbox NetworkFirst для /api/\* (fallback на кэш, maxAgeSeconds: 60).                                                                                                                  |

### Тесты Phase 3

**Backend (Jest):**

- Media: presigned URL генерируется и имеет TTL ≤ 5min; неизвестный MIME-тип отклоняется
- FCM: `sendPush` не падает если fcmToken отсутствует; Agenda job планируется при offline-получателе
- Offline push: job НЕ отправляет push если получатель вернулся онлайн до истечения 2с

**Frontend (Vitest):**

- encryptMedia / decryptMedia: зашифрованный blob ≠ исходному, расшифрованный = исходному
- Offline queue: при disconnect сообщение попадает в IndexedDB; при reconnect flush очищает очередь
- SW background message: `onBackgroundMessage` показывает notification с корректным title/body

---

## Phase 4 — Polish

**Цель:** финальные штрихи для production-ready MVP.

| #   | Статус | Задача                                        | Детали                                                                                                                                                                                                                                                                        |
| --- | ------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 26  | [ ]    | **Индикатор онлайн/оффлайн**                  | Backend: presence:change emit при connect/disconnect. Frontend: `presenceSlice` Map<userId, boolean>. Mantine `Indicator` на аватарах в списке чатов и заголовке переписки.                                                                                                   |
| 27  | [ ]    | **Infinite scroll / cursor-пагинация в чате** | При скролле вверх до 20% — загрузка предыдущей страницы. RTK Query с merge страниц. cursor = первый `_id` текущих сообщений. Mantine Loader в топе. Сохранение позиции скролла после подгрузки.                                                                               |
| 28  | [ ]    | **Экран настроек**                            | Mantine SegmentedControl для dark/light темы (localStorage → MantineProvider colorScheme). Редактирование displayName, загрузка аватара. Fingerprint публичного ключа (первые 8 байт SHA-256 в hex) для out-of-band верификации. Кнопка «Выйти» (logout + очистка IndexedDB). |
| 29  | [ ]    | **Healthcheck + Pino логирование**            | `GET /health` → `{status: 'ok', mongo: 'connected', uptime}`. Pino: JSON-логи с request ID, method, path, duration. LoggingInterceptor. ENV LOG_LEVEL (default: info).                                                                                                        |
| 30  | [ ]    | **CI/CD: GitHub Actions**                     | `turbo run lint test build --filter=[HEAD^1]`. Параллельно: lint, test (jest/vitest), build. Docker build & push → ghcr.io при push в main. Deploy workflow (Fly.io / Railway). Secrets: TURBO*TOKEN, REGISTRY_TOKEN, MONGO_URI, FIREBASE*\*.                                 |

### Тесты Phase 4

**Backend (Jest):**

- GET /health возвращает 200 и `{status: 'ok', mongo: 'connected'}`
- Pino: логи содержат requestId, method, path, duration в JSON-формате

**Frontend (Vitest + Testing Library):**

- Presence indicator: Mantine Indicator появляется/скрывается при изменении presenceSlice
- Infinite scroll: при достижении верха списка диспатчится запрос следующей страницы с корректным cursor
- Settings: переключение темы обновляет localStorage и MantineProvider colorScheme

**E2E (Playwright — опционально, после MVP):**

- Полный флоу: регистрация → добавление друга по QR → отправка сообщения → получение

---

## Зависимости между задачами

```
1 (monorepo)
 ├── 2 (configs)
 ├── 3 (shared)     → 8, 9, 10, 15, 16
 └── 4 (ui/mantine) → 11, 12, 13, 18, 19, 22, 26, 27, 28

5 (docker)          → 7

6 (nestjs scaffold)
 ├── 7 (schemas)    → 8, 9, 10, 14, 15
 └── 8 (auth)       → 9, 10, 14

11 (web scaffold)
 ├── 12 (auth UI)   → 13, 17, 18, 19
 └── 16 (crypto)    → 19, 22

33 (login backend)  → 35
34 (signChallenge)  → 33, 35
35 (auth flow UI)   → 17, 18, 19

14 (gateway)        → 17, 20, 26
15 (conv+msg)       → 18, 19, 27
17 (socket client)  → 18, 19, 20, 26

21 (media backend)  → 22
23 (FCM server)     → 24
25 (offline queue)  → зависит от 17
```

---

## Desktop Web UI

**Цель:** полноценный layout для широких экранов в браузере — без нативного приложения, только адаптив.

| #   | Статус | Задача                                      | Детали                                                                                                                                                                                                                                                                |
| --- | ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 32  | [ ]    | **Split-pane layout (sidebar + main area)** | Mantine `AppShell` (Navbar + main). `≥768px` → левая колонка 280px (список чатов, поиск, аватар пользователя) + правая (активная переписка). `<768px` → прежняя мобильная stack-навигация (TanStack Router). Без кастомного CSS — только Mantine breakpoints и props. |

### Детали desktop layout

- **Sidebar (280px, фиксированная):** список чатов (`ChatList`), поле поиска (`TextInput`), кнопка «Добавить» (QR), аватар + имя текущего пользователя внизу
- **Main area:** если чат не выбран → `Center` с placeholder («Выберите чат»); если выбран → `ChatScreen`
- **Состояние:** активный `conversationId` хранится в URL (`/chats/:id`) — TanStack Router синхронизирует sidebar и main
- **Тема:** dark/light работает одинаково в обоих лейаутах через Mantine `AppShell` токены

### Тесты Desktop UI

- `AppShell` рендерится с Navbar при ширине ≥768px и без при <768px (Vitest + Testing Library с `resizeObserver` mock)
- Выбор чата в sidebar обновляет URL и рендерит `ChatScreen` в main area
- Placeholder отображается когда ни один чат не выбран

---

## Что не входит в MVP

- Групповые чаты (схема готова, E2E сложнее — sender key protocol)
- Голосовые/видео звонки (WebRTC)
- Исчезающие сообщения
- Double Ratchet / Forward Secrecy
- Бэкап ключей через BIP39 recovery phrase (реализован через зашифрованный blob на сервере — задачи 33–35)
- Redis (добавить только при необходимости второго инстанса NestJS)
