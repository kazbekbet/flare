import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument, Types } from 'mongoose';

import { FriendshipStatus } from '@flare/shared';

/**
 * Коллекция `friendships`.
 * Отношение дружбы/запроса между двумя пользователями.
 * Compound unique `(requesterId, addresseeId)` защищает от дублирующихся запросов.
 *
 * @prop {Types.ObjectId} requesterId - Инициатор запроса.
 * @prop {Types.ObjectId} addresseeId - Адресат запроса.
 * @prop {FriendshipStatus} status - Текущий статус.
 */
@Schema({ collection: 'friendships', timestamps: true })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requesterId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addresseeId!: Types.ObjectId;

  @Prop({ type: String, enum: FriendshipStatus, default: FriendshipStatus.PENDING, required: true })
  status!: FriendshipStatus;
}

/** Mongoose-документ коллекции `friendships`. */
export type FriendshipDocument = HydratedDocument<Friendship>;

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
FriendshipSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });
FriendshipSchema.index({ addresseeId: 1, status: 1 });
