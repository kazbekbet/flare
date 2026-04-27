import { z } from 'zod';

import { MessageType } from '../enums/index.js';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Проверяет, что строка является валидным 24-символьным hex MongoDB ObjectId.
 * Использует regex вместо импорта mongoose, чтобы пакет оставался изоморфным.
 */
export const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'Invalid ObjectId');

/**
 * Zod-схема метаданных медиафайла внутри сообщения.
 * Используется как часть SendMessageDtoSchema.
 */
const MessageMediaSchema = z.object({
  url: z.string().url(),
  mediaKey: z.string().min(1),
  nonce: z.string().min(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

/**
 * Zod-схема для отправки сообщения.
 * Клиент шифрует содержимое до отправки — сервер никогда не видит plaintext.
 *
 * @prop {string} conversationId - ID переписки.
 * @prop {string} encryptedContent - Base64-encoded зашифрованное содержимое (NaCl box).
 * @prop {string} nonce - Base64-encoded nonce для расшифровки.
 * @prop {MessageType} [type=TEXT] - Тип сообщения.
 * @prop {object} [media] - Метаданные медиафайла (только для type === IMAGE).
 */
export const SendMessageDtoSchema = z.object({
  conversationId: objectIdSchema,
  encryptedContent: z.string().min(1),
  nonce: z.string().min(1),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
  media: MessageMediaSchema.optional(),
});

/** Тип DTO для отправки сообщения, выведенный из Zod-схемы. */
export type SendMessageDto = z.infer<typeof SendMessageDtoSchema>;

/**
 * Zod-схема для регистрации нового пользователя.
 * Пароль не требуется — идентификация через владение приватным ключом + JWT.
 *
 * @prop {string} displayName - Отображаемое имя (2–64 символа).
 * @prop {string} publicKey - Base64-encoded X25519 публичный ключ.
 * @prop {string} [fcmToken] - FCM-токен для push-уведомлений (опционально).
 */
export const RegisterDtoSchema = z.object({
  displayName: z.string().min(2).max(64),
  publicKey: z.string().min(1),
  signingPublicKey: z.string().optional(),
  fcmToken: z.string().optional(),
});

/** Тип DTO для регистрации, выведенный из Zod-схемы. */
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

/**
 * Zod-схема для входа по challenge-подписи.
 * Клиент подписывает timestamp приватным ключом — сервер проверяет Ed25519-подпись.
 *
 * @prop {string} displayName - Отображаемое имя пользователя.
 * @prop {string} signature - Base64-encoded Ed25519-подпись timestamp.
 * @prop {number} timestamp - Unix-timestamp в секундах, который был подписан.
 */
export const LoginDtoSchema = z.object({
  displayName: z.string().min(1).max(32),
  signature: z.string().min(1),
  timestamp: z.number().int().positive(),
});

/** Тип DTO для входа, выведенный из Zod-схемы. */
export type LoginDto = z.infer<typeof LoginDtoSchema>;

/**
 * Zod-схема для сохранения зашифрованного бэкапа ключей.
 *
 * @prop {string} encryptedBlob - Зашифрованный блоб с ключами в Base64.
 */
export const KeyBackupDtoSchema = z.object({
  encryptedBlob: z.string().min(1),
});

/** Тип DTO для бэкапа ключей, выведенный из Zod-схемы. */
export type KeyBackupDto = z.infer<typeof KeyBackupDtoSchema>;

/**
 * Zod-схема для обновления профиля текущего пользователя.
 * Все поля опциональны — патч-запрос. Пустой объект отвергается.
 *
 * @prop {string} [displayName] - Новое отображаемое имя (2–64 символа).
 * @prop {string} [avatarUrl] - URL аватара.
 * @prop {string} [fcmToken] - FCM-токен устройства. Передавать `null`-строку нельзя, используйте omit.
 */
export const UpdateUserDtoSchema = z
  .object({
    displayName: z.string().min(2).max(64).optional(),
    avatarUrl: z.string().url().optional(),
    fcmToken: z.string().min(1).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

/** Тип DTO для обновления профиля, выведенный из Zod-схемы. */
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

/**
 * Zod-схема для отправки запроса на добавление в друзья.
 *
 * @prop {string} addresseeId - ID пользователя, которому адресован запрос.
 */
export const CreateFriendRequestDtoSchema = z.object({
  addresseeId: objectIdSchema,
});

/** Тип DTO для запроса дружбы, выведенный из Zod-схемы. */
export type CreateFriendRequestDto = z.infer<typeof CreateFriendRequestDtoSchema>;

/**
 * Zod-схема для принятия запроса на добавление в друзья.
 *
 * @prop {string} friendshipId - ID записи дружбы, которую нужно принять.
 */
export const AcceptFriendDtoSchema = z.object({
  friendshipId: objectIdSchema,
});

/** Тип DTO для принятия запроса дружбы, выведенный из Zod-схемы. */
export type AcceptFriendDto = z.infer<typeof AcceptFriendDtoSchema>;
