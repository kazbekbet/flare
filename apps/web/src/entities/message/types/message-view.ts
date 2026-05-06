/**
 * Представление сообщения, возвращаемое сервером.
 */
export interface MessageView {
  _id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  nonce: string;
  type: 'TEXT' | 'IMAGE';
  media?: { url: string; mediaKey: string; nonce: string };
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}
