import type { ConversationType, FriendshipStatus, MessageType } from '../enums/index.js';

/**
 * Публичный профиль пользователя.
 * Приватный ключ никогда не покидает устройство — сервер хранит только публичный.
 *
 * @prop {string} id - Уникальный идентификатор пользователя (UUID).
 * @prop {string} displayName - Отображаемое имя пользователя.
 * @prop {string} publicKey - Base64-закодированный X25519 публичный ключ для E2E-шифрования.
 * @prop {string} [avatarUrl] - URL аватара пользователя (хранится в MinIO/S3).
 * @prop {string} [fcmToken] - FCM-токен устройства для push-уведомлений. Обновляется при каждом запуске.
 * @prop {Date} createdAt - Дата создания аккаунта.
 * @prop {Date} updatedAt - Дата последнего обновления профиля.
 */
export interface User {
  id: string;
  displayName: string;
  publicKey: string;
  avatarUrl?: string;
  fcmToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Метаданные зашифрованного медиафайла, прикреплённого к сообщению.
 * Сервер хранит только зашифрованный blob — plaintext недоступен.
 *
 * @prop {string} url - URL зашифрованного blob в MinIO/S3.
 * @prop {string} mediaKey - Симметричный ключ (nacl.secretbox), зашифрованный для получателя через nacl.box. Base64-encoded.
 * @prop {string} nonce - Base64-encoded nonce для расшифровки mediaKey.
 * @prop {number} [width] - Ширина изображения в пикселях (для плейсхолдера до загрузки).
 * @prop {number} [height] - Высота изображения в пикселях (для плейсхолдера до загрузки).
 */
export interface MessageMedia {
  url: string;
  mediaKey: string;
  nonce: string;
  width?: number;
  height?: number;
}

/**
 * Сообщение в переписке.
 * Сервер хранит только зашифрованное содержимое — plaintext никогда не передаётся на сервер.
 *
 * @prop {string} id - Уникальный идентификатор сообщения (MongoDB ObjectId как строка).
 * @prop {string} conversationId - ID переписки, к которой относится сообщение.
 * @prop {string} senderId - ID пользователя, отправившего сообщение.
 * @prop {string} encryptedContent - Base64-encoded зашифрованное содержимое (NaCl box).
 * @prop {string} nonce - Base64-encoded nonce для расшифровки содержимого.
 * @prop {MessageType} type - Тип сообщения: текст или изображение.
 * @prop {MessageMedia} [media] - Метаданные медиафайла (только для type === IMAGE).
 * @prop {Date} [deliveredAt] - Время доставки получателю (проставляется при socket connect).
 * @prop {Date} [readAt] - Время прочтения получателем (проставляется при открытии чата).
 * @prop {Date} createdAt - Время отправки сообщения.
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  nonce: string;
  type: MessageType;
  media?: MessageMedia;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Переписка (диалог) между пользователями.
 * Содержит денормализованное последнее сообщение для быстрого отображения списка чатов.
 *
 * @prop {string} id - Уникальный идентификатор переписки (MongoDB ObjectId как строка).
 * @prop {ConversationType} type - Тип переписки: личный диалог или групповой чат.
 * @prop {string[]} memberIds - Список ID участников переписки.
 * @prop {Message} [lastMessage] - Денормализованное последнее сообщение. Обновляется при каждой отправке.
 * @prop {Date} createdAt - Дата создания переписки.
 * @prop {Date} updatedAt - Дата последнего обновления.
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  memberIds: string[];
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Запрос на добавление в друзья / дружба между двумя пользователями.
 * Создаётся инициатором, принимается или отклоняется адресатом.
 * При принятии автоматически создаётся Conversation типа DIRECT.
 *
 * @prop {string} id - Уникальный идентификатор записи дружбы.
 * @prop {string} requesterId - ID пользователя, инициировавшего запрос.
 * @prop {string} addresseeId - ID пользователя, которому адресован запрос.
 * @prop {FriendshipStatus} status - Текущий статус дружбы.
 * @prop {Date} createdAt - Дата создания запроса.
 * @prop {Date} updatedAt - Дата последнего изменения статуса.
 */
export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}
