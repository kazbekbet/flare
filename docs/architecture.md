# Архитектура мессенджера «Flare»

> **Статус:** MVP Design Doc v1.2  
> **Стек:** Turborepo · NestJS · React PWA · MongoDB · FCM · Socket.io · E2E Encryption  
> **Принцип:** Privacy-first, offline-capable, horizontally scalable  
> **Лицензия:** MIT — self-hosted, open-source

---

### Идентичность проекта

| | |
|---|---|
| **Название** | Flare |
| **Домен** | `useflare.dev` / `flareapp.io` |
| **Репозиторий** | `github.com/your-org/flare` |
| **Пакеты** | `@flare/web` · `@flare/server` · `@flare/shared` |
| **Позиционирование** | Self-hosted E2E мессенджер для близких. Разворачивается на своём сервере за 5 минут. |

---

## 1. Обзор системы

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                             │
│  React + RTK + Socket.io-client + tweetnacl + Vite PWA Plugin  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WSS
                    ┌────▼─────┐
                    │  Nginx   │  TLS termination, static files,
                    │  (proxy) │  rate limiting, load balancing
                    └────┬─────┘
                    ┌────▼─────┐
                    │ NestJS   │  Single instance (MVP)
                    │  API     │  Socket.io in-memory adapter
                    └────┬─────┘
                    ┌────▼─────┐
                    │ MongoDB  │  Replica Set · sessions · presence
                    │(Mongoose)│  jobs (Agenda.js)
                    └────┬─────┘
          ┌─────────────┴──────────────┐
     ┌────▼─────┐                ┌─────▼────┐
     │  MinIO   │                │  FCM     │
     │  (S3)    │                │ (Firebase)│
     └──────────┘                └──────────┘
```

---

## 2. Монорепозиторий (Turborepo)

```
apps/
  web/                  # React PWA (Vite)
  server/               # NestJS API + WebSocket gateway

packages/
  shared/               # Общие типы, DTO, утилиты, crypto-примитивы
  ui/                   # Дизайн-система (компоненты без бизнес-логики)
  config/
    tsconfig/           # Базовые tsconfig.json
    eslint/             # Общий eslint-конфиг
    prettier/           # Общий prettier-конфиг

turbo.json              # Pipeline: build → test → lint
package.json            # Workspace root (pnpm workspaces)
```

**Почему Turborepo, а не nx:**
- Нулевая конфигурация для простых случаев
- Remote caching из коробки
- Нет vendor lock-in на платформу

**Package manager:** pnpm (эффективные symlinks, строгое разрешение зависимостей)

---

## 3. Frontend — React PWA

### 3.1 Технологический стек

| Область | Решение | Обоснование |
|---------|---------|-------------|
| Bundler | Vite + `vite-plugin-pwa` | Быстрый HMR, нативный Service Worker |
| UI Framework | React 18 + TypeScript | Требование задачи |
| State | RTK (Redux Toolkit) + RTK Query | Предиктивное состояние, кэш API |
| Real-time | socket.io-client | Требование задачи |
| Crypto | tweetnacl + tweetnacl-util | Аудированная, zero-dependency |
| Routing | TanStack Router | Type-safe роуты |
| Forms | React Hook Form + Zod | Валидация из shared-схем |
| Styling | CSS Modules + CSS Variables | Без runtime-overhead |
| Storage | idb-keyval (IndexedDB) | Хранение приватных ключей, offline messages |
| QR | qrcode.react (генерация) + html5-qrcode (сканирование) | |
| Images | browser-image-compression | Сжатие до загрузки |

### 3.2 PWA конфигурация

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',          // API — сеть, потом кэш
        options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 60 } }
      }
    ]
  },
  manifest: {
    name: 'Flare',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0f172a'
  }
})
```

### 3.3 Структура приложения

```
src/
  app/
    store.ts              # RTK store
    router.tsx            # TanStack Router
  features/
    auth/                 # Генерация ID, keypair, QR
    chat/                 # Список чатов, сообщения
    friends/              # Добавление по QR, список друзей
    media/                # Загрузка/отображение изображений
  shared/
    crypto/               # E2E обёртки над tweetnacl
    socket/               # Socket.io singleton + RTK listener middleware
    ui/                   # Локальные переиспользуемые компоненты
  service-worker/
    offline-queue.ts      # Очередь сообщений при потере сети
```

### 3.4 Offline-стратегия

- Неотправленные сообщения → IndexedDB (`offline-queue`)
- Service Worker при восстановлении сети → flush очереди
- Последние 50 сообщений каждого чата кэшируются локально

---

## 4. Backend — NestJS

### 4.1 Структура модулей

```
src/
  modules/
    auth/                 # JWT, refresh tokens, keypair registration
    users/                # Профиль, публичный ключ, аватары
    friends/              # Запросы дружбы, список контактов
    conversations/        # Создание/получение диалогов
    messages/             # CRUD, доставка, статусы
    media/                # Presigned S3 URLs, валидация
    gateway/              # Socket.io WebSocket gateway
    health/               # Healthcheck endpoint
  common/
    guards/               # JwtAuthGuard, WsJwtGuard
    interceptors/         # Logging, Transform response
    filters/              # Global exception filter
    mongoose/             # MongooseModule, connection factory
  config/                 # ConfigModule с Joi-валидацией
```

### 4.2 WebSocket Gateway

```ts
@WebSocketGateway({ cors: true, transports: ['websocket'] })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {

  // Аутентификация при подключении через JWT в handshake.auth
  async handleConnection(socket: AuthenticatedSocket) {
    const userId = socket.data.userId;
    await this.redisService.setPresence(userId, 'online');
    await socket.join(`user:${userId}`);           // личная комната
    // вступить во все комнаты активных разговоров
    const convIds = await this.convService.getUserConversationIds(userId);
    convIds.forEach(id => socket.join(`conv:${id}`));
  }

  @SubscribeMessage('message:send')
  async handleMessage(socket: AuthenticatedSocket, dto: SendMessageDto) {
    // Сообщение уже зашифровано на клиенте — сервер не видит plaintext
    const message = await this.messagesService.create(dto);
    this.server.to(`conv:${dto.conversationId}`).emit('message:new', message);
    // Если получатель offline → Bull job для push-уведомления
    await this.notificationQueue.add('push', { message });
  }
}
```

**Масштабирование WebSocket:** `@socket.io/redis-adapter` с Redis Pub/Sub. Любой API-инстанс может отправить событие клиенту, подключённому к другому инстансу.

### 4.3 API Endpoints (REST)

```
POST   /auth/register         # Генерация ID, регистрация публичного ключа
POST   /auth/login            # (опционально: PIN-код + device fingerprint)
POST   /auth/refresh          # Обновление JWT
POST   /auth/logout

GET    /users/me
PATCH  /users/me
GET    /users/:id/public-key  # Получить публичный ключ для E2E

POST   /friends/request       # Отправить запрос по userId
PATCH  /friends/:id/accept
PATCH  /friends/:id/decline
GET    /friends               # Список принятых контактов

GET    /conversations         # Список диалогов текущего пользователя
GET    /conversations/:id/messages?cursor=&limit=50  # Пагинация (cursor-based)

POST   /media/upload-url      # Presigned URL для загрузки в S3
GET    /media/:key/download-url

GET    /health
```

---

## 5. База данных (MongoDB + Mongoose)

### 5.1 Почему MongoDB для этой задачи

Сообщения — документы по природе: вложенные объекты (медиа, реакции), гибкая схема без ALTER TABLE, нативный cursor по `_id` (ObjectId содержит timestamp бесплатно). Шардирование по `conversationId` при росте — без боли.

### 5.2 Схемы (Mongoose + TypeScript)

**users**
```ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  displayName: string;

  @Prop({ unique: true, sparse: true })
  username?: string;

  @Prop({ required: true })
  publicKey: string;           // Base64 X25519 public key

  @Prop()
  avatarUrl?: string;
}
// collection: users
// index: { username: 1 } unique sparse
```

**friendships**
```ts
@Schema({ timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addresseeId: Types.ObjectId;

  @Prop({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED'], default: 'PENDING' })
  status: string;
}
// index: { requesterId: 1, addresseeId: 1 } unique
// index: { addresseeId: 1, status: 1 }       ← входящие запросы
```

**conversations**
```ts
@Schema({ timestamps: true })
export class Conversation {
  @Prop({ enum: ['DIRECT', 'GROUP'], default: 'DIRECT' })
  type: string;

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  memberIds: Types.ObjectId[];  // денормализация — не нужен отдельный join

  @Prop({ type: Object })
  lastMessage?: {              // денормализация для списка чатов (без доп. запроса)
    encryptedContent: string;
    senderId: string;
    createdAt: Date;
  };
}
// index: { memberIds: 1 }     ← "все чаты пользователя"
// index: { 'lastMessage.createdAt': -1 }
```

**messages**
```ts
@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  // Сервер хранит только ciphertext — plaintext недоступен
  @Prop({ required: true })
  encryptedContent: string;    // Base64 NaCl box

  @Prop({ required: true })
  nonce: string;               // Base64 nonce

  @Prop({ enum: ['TEXT', 'IMAGE'], default: 'TEXT' })
  type: string;

  @Prop({ type: Object })
  media?: {
    url: string;               // S3 URL зашифрованного blob
    mediaKey: string;          // Зашифрованный симметричный ключ
    nonce: string;
    width?: number;
    height?: number;
  };

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;
}
// index: { conversationId: 1, _id: -1 }  ← cursor пагинация (ObjectId = timestamp)
// index: { senderId: 1 }
```

### 5.3 Cursor-пагинация через ObjectId

ObjectId содержит timestamp в первых 4 байтах — отдельное поле `createdAt` для сортировки не нужно:

```ts
// Запрос следующей страницы
const messages = await this.messageModel
  .find({
    conversationId,
    _id: { $lt: new Types.ObjectId(cursor) },  // cursor = последний _id
  })
  .sort({ _id: -1 })
  .limit(50)
  .lean();
```

### 5.4 Денормализация `lastMessage` в Conversation

Список чатов отображается часто. Вместо агрегации `$lookup + $sort` — при каждой новой записи сообщения обновляем `lastMessage` в документе conversation:

```ts
await this.conversationModel.updateOne(
  { _id: message.conversationId },
  { $set: { lastMessage: { encryptedContent, senderId, createdAt: new Date() } } },
);
```

Один дополнительный `updateOne` при отправке — экономит N запросов при каждом открытии списка чатов.

### 5.5 Replica Set

MongoDB требует Replica Set для транзакций (нужны при создании conversation + первого membership атомарно):

```yaml
# Минимальная конфигурация для MVP
mongo-primary:   priority: 1
mongo-secondary: priority: 0   # только репликация, не принимает записи
mongo-arbiter:   arbiterOnly: true  # только голосование, без данных
```

Чтение с `readPreference: 'secondaryPreferred'` — история сообщений идёт на secondary, не нагружая primary.

---

## 6. Шифрование (E2E)

### 6.1 Модель угроз

- **Сервер скомпрометирован:** plaintext недоступен, только ciphertext
- **Man-in-the-middle:** публичные ключи верифицируются через QR (out-of-band)
- **Утечка устройства:** приватный ключ зашифрован в IndexedDB через PIN/биометрику

### 6.2 Криптографическая схема

**Алгоритмы:** X25519 (ECDH) + XSalsa20-Poly1305 (NaCl box) из библиотеки `tweetnacl`

#### Инициализация (однократно на устройстве)

```ts
// packages/shared/crypto/identity.ts
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

export function generateIdentityKeypair() {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),   // → сервер
    privateKey: encodeBase64(kp.secretKey),  // → IndexedDB (зашифровано)
  };
}
```

#### Шифрование сообщения (отправитель)

```ts
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: string,
  senderPrivateKey: string,
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(
    new TextEncoder().encode(plaintext),
    nonce,
    decodeBase64(recipientPublicKey),
    decodeBase64(senderPrivateKey),
  );
  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce),
  };
}
```

#### Дешифрование (получатель)

```ts
export function decryptMessage(
  ciphertext: string,
  nonce: string,
  senderPublicKey: string,
  recipientPrivateKey: string,
): string {
  const decrypted = nacl.box.open(
    decodeBase64(ciphertext),
    decodeBase64(nonce),
    decodeBase64(senderPublicKey),
    decodeBase64(recipientPrivateKey),
  );
  if (!decrypted) throw new Error('Decryption failed');
  return new TextDecoder().decode(decrypted);
}
```

#### Медиафайлы

```
1. Клиент генерирует случайный симметричный ключ (nacl.secretbox key)
2. Шифрует изображение: nacl.secretbox(imageBytes, nonce, key)
3. Шифрует ключ для получателя: nacl.box(key, ...)
4. Загружает зашифрованный blob в S3 по presigned URL
5. В сообщении хранит: S3-URL + зашифрованный ключ + nonce
```

### 6.3 Хранение приватного ключа на устройстве

```ts
// Приватный ключ шифруется PIN-кодом пользователя
// AES-GCM через Web Crypto API
async function storePrivateKey(privateKey: Uint8Array, pin: string) {
  const pinKey = await deriveKeyFromPin(pin);           // PBKDF2
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    pinKey,
    privateKey,
  );
  await idbSet('identity.privateKey', { encrypted, iv: Array.from(iv) });
}
```

---

## 7. Авторизация и добавление друзей по QR

### 7.1 Регистрация

```
Клиент                              Сервер
  │                                   │
  │── generateIdentityKeypair() ──────│  (локально)
  │                                   │
  │── POST /auth/register ────────────▶
  │   { displayName, publicKey }       │
  │                                   │── INSERT user (uuid, publicKey)
  │◀── { userId, accessToken, ───────│
  │      refreshToken (httpOnly) }     │
```

Никакого пароля. Идентификация = владение приватным ключом + JWT.

### 7.2 QR-код для добавления в друзья

```ts
// QR payload — компактный, не раскрывает ключ (только ID)
const qrPayload = JSON.stringify({
  v: 1,
  uid: currentUser.id,    // UUID
  name: currentUser.displayName,
});

// Публичный ключ запрашивается с сервера после сканирования
// GET /users/:id/public-key
```

**Флоу добавления:**

```
Алиса сканирует QR Боба
  │
  ├─ Получает uid Боба из QR
  ├─ GET /users/{bobId}/public-key  → сохраняет локально
  ├─ POST /friends/request { addresseeId: bobId }
  │
Боб получает уведомление (Socket.io event: friend:request)
  ├─ PATCH /friends/{requestId}/accept
  │
Алиса получает friend:accepted
  ├─ GET /users/{bobId}/public-key  (теперь можно писать E2E)
  └─ Conversation создаётся автоматически
```

**Верификация публичного ключа (опционально для параноиков):**
Показывать fingerprint ключа в UI (первые 8 байт SHA-256 publicKey в hex).
Пользователи могут сверить вслух — TOFU (Trust On First Use) модель, как в Signal.

---

## 8. Push-уведомления (FCM)

**Выбор:** Firebase Cloud Messaging — бесплатно, покрывает Web/iOS/Android, `firebase-admin` на сервере это 10 строк кода, ничего кастомного.

### 8.1 Регистрация FCM-токена на клиенте

```ts
// Service Worker регистрирует push и отправляет токен на сервер
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const fcmToken = await getToken(messaging, { vapidKey: VAPI_KEY });

// Сохранить токен на сервере
await api.patch('/users/me', { fcmToken });
```

Токен хранится в поле `fcmToken` коллекции `users`. Обновляется при каждом запуске приложения — FCM токены протухают.

### 8.2 Отправка push с сервера

```ts
// notifications.service.ts
import { getMessaging } from 'firebase-admin/messaging';

async sendPush(userId: string, payload: PushPayload) {
  const user = await this.userModel.findById(userId).select('fcmToken').lean();
  if (!user?.fcmToken) return;  // нет токена — нет пуша

  await getMessaging().send({
    token: user.fcmToken,
    notification: {
      title: payload.senderName,
      body: '🔒 Зашифрованное сообщение',  // plaintext недоступен — общий текст
    },
    webpush: {
      fcmOptions: { link: `/chat/${payload.conversationId}` },
    },
  });
}
```

**Важно:** в тело пуша нельзя положить plaintext (он зашифрован). Показываем нейтральный текст — как в Signal.

### 8.3 Флоу при входящем сообщении

```
Алиса отправляет сообщение
  │
  ├─ NestJS сохраняет в MongoDB
  ├─ Socket.io emit → conv:room (если Боб онлайн — получает мгновенно)
  │
  └─ Боб offline?
       ├─ Agenda.js job: delay 2s (ждём reconnect)
       └─ Если всё ещё offline → FCM push → Боб видит уведомление
            └─ Открывает приложение → Socket.io connect → загружает сообщения
```

### 8.4 Service Worker (клиент)

```ts
// firebase-messaging-sw.js (public/)
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png',
    data: { url: payload.webpush.fcmOptions.link },
  });
});

// Клик по уведомлению → открыть нужный чат
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  clients.openWindow(e.notification.data.url);
});
```

---

## 9. MongoDB как замена Redis (сессии, присутствие, очереди)

Без Redis все временные данные уходят в MongoDB через **TTL-индексы** и **Agenda.js**.

### 9.1 Сессии (refresh tokens)

```ts
@Schema()
export class Session {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) jti: string;        // JWT ID
  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt: Date;                               // TTL-индекс — MongoDB удаляет сам
}
// db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
// db.sessions.createIndex({ userId: 1, jti: 1 }, { unique: true })
```

### 9.2 Присутствие (online/offline)

```ts
@Schema()
export class Presence {
  @Prop({ required: true, unique: true }) userId: string;
  @Prop({ required: true, index: { expireAfterSeconds: 35 } })
  updatedAt: Date;    // клиент шлёт heartbeat каждые 30s → запись обновляется
}

// Проверить онлайн:
const isOnline = await this.presenceModel.exists({ userId });
```

Точность ±35 секунд — для мессенджера семьи вполне достаточно.

### 9.3 Очереди (Agenda.js)

Agenda работает поверх MongoDB — отдельного брокера не нужно.

```ts
// agenda.module.ts
const agenda = new Agenda({ db: { address: MONGO_URI, collection: 'jobs' } });

agenda.define('send-push', async (job) => {
  const { userId, conversationId, senderName } = job.attrs.data;
  const isOnline = await presenceModel.exists({ userId });
  if (!isOnline) {
    await notificationsService.sendPush(userId, { conversationId, senderName });
  }
});

// Запланировать после отправки сообщения
await agenda.schedule('in 2 seconds', 'send-push', {
  userId: recipientId,
  conversationId,
  senderName,
});
```

**Что хранится в коллекции `jobs`:** задача, время запуска, статус, данные. При рестарте сервера незавершённые задачи подхватываются автоматически.

---

## 10. Масштабируемость

### 10.1 WebSocket — MVP vs Production

**MVP (сейчас):** один инстанс NestJS, Socket.io с in-memory адаптером. Никакого Redis. Для семьи и друзей (~50-200 активных пользователей) одного инстанса хватит с запасом.

**При росте:** добавить Redis только ради `@socket.io/redis-adapter`. Это единственное, что Redis даёт поверх того, что уже есть. Миграция — замена одной строки инициализации Socket.io.

```ts
// MVP
const io = new Server(server);                         // in-memory

// При росте — просто добавить:
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(pubClient, subClient));       // multi-instance
```

### 10.2 База данных (MongoDB)

- **Primary:** все записи (INSERT, UPDATE)
- **Secondary:** чтение сообщений и списков (`readPreference: secondaryPreferred`)
- **Arbiter:** голосование при failover, без данных
- Шардирование по `conversationId` при росте — данные одного чата всегда на одном шарде
- Connection pool через Mongoose `maxPoolSize: 10` на инстанс

### 10.3 Очереди (Agenda.js → BullMQ при росте)

Agenda на MongoDB подходит для MVP. При > 1K сообщений/сек — мигрировать на BullMQ + Redis. Интерфейс схожий, замена локализована в одном модуле.

---

## 11. Безопасность

| Аспект | Решение |
|--------|---------|
| Transport | HTTPS/WSS + HSTS |
| Auth | JWT (15min) + Refresh (7d, httpOnly Secure cookie) |
| Rate Limiting | NestJS ThrottlerModule + Nginx limit_req |
| Validation | class-validator + Zod (shared schemas) |
| NoSQL Injection | Mongoose sanitize-mongo-query middleware |
| XSS | CSP headers, sanitize на клиенте |
| CORS | Whitelist origin в NestJS |
| Secrets | ENV vars через ConfigModule + Joi |
| Media | Presigned URLs с TTL 5min, файлы зашифрованы |
| Helmet | NestJS Helmet middleware |

---

## 12. Структура DevOps (базовый уровень для MVP)

```yaml
# docker-compose.yml (локальная разработка)
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0"]
    ports: ["27017:27017"]
  mongo-init:
    image: mongo:7
    depends_on: [mongo]
    command: >
      mongosh --host mongo --eval
      "rs.initiate({_id:'rs0', members:[{_id:0,host:'mongo:27017'}]})"
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
  server:
    build: ./apps/server
    depends_on: [mongo, minio]
    environment:
      MONGO_URI: mongodb://mongo:27017/flare?replicaSet=rs0
      FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
      FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY}
  web:
    build: ./apps/web
```

```
# CI (GitHub Actions)
turbo run lint test build --filter=[HEAD^1]
  → lint (все пакеты параллельно)
  → test (jest — server, vitest — web)
  → build (turbo cache → только изменённое)
  → docker build & push
  → deploy (Fly.io / Railway / VPS)
```

---

## 13. MVP Roadmap

### Phase 1 — Foundation (2-3 недели)
- [ ] Turborepo setup, shared пакеты, tsconfig
- [ ] NestJS: auth, users, friends модули
- [ ] MongoDB схемы (Mongoose) + индексы + TTL (сессии, присутствие)
- [ ] Replica Set локально (docker-compose)
- [ ] React: роутинг, store, auth flow (генерация keypair + регистрация)
- [ ] QR-генерация своего ID + сканирование чужого

### Phase 2 — Core Messaging (2-3 недели)
- [ ] WebSocket Gateway (in-memory adapter — Redis не нужен)
- [ ] E2E шифрование (tweetnacl интеграция)
- [ ] RTK + Socket.io middleware (real-time events → Redux)
- [ ] Список чатов + экран переписки
- [ ] Статусы доставки (delivered / read receipts)

### Phase 3 — Media + Push + PWA (1-2 недели)
- [ ] MinIO/S3 presigned URLs + зашифрованная загрузка изображений
- [ ] FCM: firebase-admin на сервере + Service Worker на клиенте
- [ ] Agenda.js: delayed push при offline-получателе
- [ ] Service Worker + offline queue
- [ ] Web App Manifest, install prompt

### Phase 4 — Polish (1 неделя)
- [ ] Индикатор онлайн/оффлайн (MongoDB presence + TTL)
- [ ] Cursor-based пагинация сообщений
- [ ] Сжатие изображений на клиенте
- [ ] Базовый healthcheck + логирование (Pino)

---

## 14. Ключевые архитектурные решения — почему именно это

| Решение | Альтернатива | Почему выбрано |
|---------|-------------|----------------|
| **NestJS** | Express | DI, модули, декораторы — структура не разваливается при росте |
| **Turborepo** | Nx | Проще, нулевая конфигурация, хорошо для 2 приложений |
| **tweetnacl** | WebCrypto API напрямую | Аудирована, стабильный API, кроссплатформенный |
| **MongoDB** | PostgreSQL | Документная модель под сообщения, гибкая схема, нативный шардинг |
| **Mongoose** | Prisma / TypeORM | Type-safe схемы, хуки, populate — без overhead миграций |
| **ObjectId как курсор** | OFFSET/LIMIT | Timestamp встроен в ObjectId — курсор бесплатно, O(log n) |
| **FCM** | Web Push API самостоятельно | Бесплатно, покрывает iOS+Android+Web, минимум кода |
| **Agenda.js** | BullMQ + Redis | MongoDB-native очереди — нет отдельного брокера для MVP |
| **TTL-индексы Mongo** | Redis | Сессии и присутствие без дополнительного сервиса |
| **In-memory Socket.io** | Redis adapter | Достаточно для одного инстанса; Redis легко добавить позже |
| **QR = только userId** | QR = publicKey | Меньше payload, ключ верифицируется по secure каналу |
| **idb-keyval** | localStorage | Асинхронный, большой объём, structured data |

---

## 15. Что НЕ входит в MVP (следующие итерации)

- Групповые чаты (схема готова, но UI/логика E2E сложнее — sender key protocol)
- Голосовые/видео звонки (WebRTC — отдельный проект)
- Исчезающие сообщения
- Реакции на сообщения
- Полноценный Double Ratchet (Forward Secrecy) — добавляется поверх текущей схемы
- Бэкап ключей (recovery фраза — 12 слов BIP39)
- **Redis** — добавить только когда понадобится второй инстанс NestJS

---

*Документ подготовлен как стартовая точка. Все технические решения покрывают MVP и заложены с расчётом на рост до ~10K DAU без переписывания архитектуры.*
