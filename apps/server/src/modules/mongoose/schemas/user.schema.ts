import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import type { HydratedDocument } from 'mongoose';

/**
 * Коллекция `users`.
 * Хранит публичный профиль. Приватный ключ никогда не покидает устройство —
 * сервер знает только публичный X25519 ключ для E2E-шифрования.
 *
 * @prop {string} displayName - Отображаемое имя пользователя (уникальное в рамках MVP).
 * @prop {string} publicKey - Base64-encoded X25519 публичный ключ.
 * @prop {string} [avatarUrl] - URL аватара в MinIO/S3.
 * @prop {string} [fcmToken] - FCM-токен устройства для push-уведомлений.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, minlength: 2, maxlength: 64 })
  displayName!: string;

  @Prop({ required: true })
  publicKey!: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  fcmToken?: string;
}

/** Mongoose-документ коллекции `users`. */
export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
