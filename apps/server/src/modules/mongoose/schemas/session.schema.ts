import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument, Types } from 'mongoose';

/**
 * Коллекция `sessions`.
 * Хранит активные refresh-токены. TTL-индекс на `expiresAt` (expireAfterSeconds: 0)
 * автоматически удаляет истёкшие записи — отдельный Redis не нужен.
 *
 * @prop {Types.ObjectId} userId - Владелец сессии.
 * @prop {string} jti - Уникальный идентификатор токена (JWT ID). При refresh ротируется.
 * @prop {Date} expiresAt - Момент истечения сессии (TTL).
 */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  jti!: string;

  @Prop({ required: true, index: { expireAfterSeconds: 0 } })
  expiresAt!: Date;
}

/** Mongoose-документ коллекции `sessions`. */
export type SessionDocument = HydratedDocument<Session>;

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ userId: 1, jti: 1 }, { unique: true });
