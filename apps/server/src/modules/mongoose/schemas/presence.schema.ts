import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument, Types } from 'mongoose';

/**
 * Коллекция `presences`.
 * Хранит «онлайн-статус» пользователя. Клиент шлёт heartbeat каждые 30с —
 * запись обновляется. TTL 35с автоматически удаляет запись при disconnect.
 *
 * @prop {Types.ObjectId} userId - ID пользователя (уникально).
 * @prop {Date} updatedAt - Время последнего heartbeat (TTL expireAfterSeconds: 35).
 */
@Schema({ collection: 'presences', timestamps: true })
export class Presence {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, default: () => new Date(), index: { expireAfterSeconds: 35 } })
  updatedAt!: Date;
}

/** Mongoose-документ коллекции `presences`. */
export type PresenceDocument = HydratedDocument<Presence>;

export const PresenceSchema = SchemaFactory.createForClass(Presence);
