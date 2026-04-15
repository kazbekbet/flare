import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument, Types } from 'mongoose';

import { MessageType } from '@flare/shared';

/**
 * Метаданные зашифрованного медиафайла в сообщении.
 *
 * @prop {string} url - URL зашифрованного blob в MinIO/S3.
 * @prop {string} mediaKey - Зашифрованный для получателя симметричный ключ (Base64 NaCl box).
 * @prop {string} nonce - Base64 nonce для расшифровки mediaKey.
 * @prop {number} [width] - Ширина в пикселях.
 * @prop {number} [height] - Высота в пикселях.
 */
export interface MessageMediaEmbed {
  url: string;
  mediaKey: string;
  nonce: string;
  width?: number;
  height?: number;
}

/**
 * Коллекция `messages`.
 * Сервер хранит только ciphertext — plaintext недоступен даже при компрометации БД.
 * Cursor-пагинация идёт через `_id` (ObjectId содержит timestamp — отдельный индекс по createdAt не нужен).
 *
 * @prop {Types.ObjectId} conversationId - Переписка, к которой принадлежит сообщение.
 * @prop {Types.ObjectId} senderId - Отправитель.
 * @prop {string} encryptedContent - Base64 NaCl box ciphertext.
 * @prop {string} nonce - Base64 nonce.
 * @prop {MessageType} type - Тип сообщения.
 * @prop {MessageMediaEmbed} [media] - Метаданные медиа (только для IMAGE).
 * @prop {Date} [deliveredAt] - Время доставки получателю.
 * @prop {Date} [readAt] - Время прочтения получателем.
 */
@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  senderId!: Types.ObjectId;

  @Prop({ required: true })
  encryptedContent!: string;

  @Prop({ required: true })
  nonce!: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT, required: true })
  type!: MessageType;

  @Prop({ type: Object })
  media?: MessageMediaEmbed;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;
}

/** Mongoose-документ коллекции `messages`. */
export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, _id: -1 });
