/**
 * Тип содержимого сообщения.
 * Определяет, как клиент должен отображать и обрабатывать сообщение.
 *
 * @enum {string}
 * @prop TEXT - Обычное текстовое сообщение (зашифрованный plaintext).
 * @prop IMAGE - Сообщение с изображением (зашифрованный blob + зашифрованный симметричный ключ).
 */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

/**
 * Статус запроса на добавление в друзья.
 *
 * @enum {string}
 * @prop PENDING - Запрос отправлен, ожидает ответа адресата.
 * @prop ACCEPTED - Запрос принят — оба пользователя являются контактами.
 * @prop DECLINED - Запрос отклонён адресатом.
 * @prop BLOCKED - Пользователь заблокирован.
 */
export enum FriendshipStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  BLOCKED = 'BLOCKED',
}

/**
 * Тип диалога (переписки).
 *
 * @enum {string}
 * @prop DIRECT - Личный диалог между двумя пользователями.
 * @prop GROUP - Групповой чат (в MVP не реализован).
 */
export enum ConversationType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}
