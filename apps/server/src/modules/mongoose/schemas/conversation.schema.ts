import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument, Types } from 'mongoose';

import { ConversationType } from '@flare/shared';

/**
 * Денормализованное последнее сообщение переписки (embedded document).
 * Хранится прямо в `Conversation` для быстрого отображения списка чатов
 * без дополнительного `$lookup` по коллекции messages.
 *
 * @prop {string} encryptedContent - Base64 NaCl box.
 * @prop {string} senderId - ID отправителя (строка).
 * @prop {Date} createdAt - Время отправки сообщения.
 */
export interface LastMessagePreview {
  encryptedContent: string;
  senderId: string;
  createdAt: Date;
}

/**
 * Коллекция `conversations`.
 * Диалог или групповой чат. `memberIds` индексируется для запроса
 * «все чаты пользователя». `lastMessage.createdAt` используется для сортировки.
 *
 * @prop {ConversationType} type - Тип переписки.
 * @prop {Types.ObjectId[]} memberIds - Участники.
 * @prop {LastMessagePreview} [lastMessage] - Денормализованное последнее сообщение.
 */
@Schema({ collection: 'conversations', timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: ConversationType, default: ConversationType.DIRECT, required: true })
  type!: ConversationType;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  memberIds!: Types.ObjectId[];

  @Prop({ type: Object })
  lastMessage?: LastMessagePreview;
}

/** Mongoose-документ коллекции `conversations`. */
export type ConversationDocument = HydratedDocument<Conversation>;

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ memberIds: 1 });
ConversationSchema.index({ 'lastMessage.createdAt': -1 });
