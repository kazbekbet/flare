import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { type HydratedDocument } from 'mongoose';

/**
 * Хранит информацию о применённых миграциях.
 * Коллекция `_migrations`.
 */
@Schema({ collection: '_migrations', timestamps: true })
export class MigrationRecord {
  @Prop({ type: Number, required: true, unique: true })
  version!: number;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Date, required: true })
  appliedAt!: Date;
}

export type MigrationRecordDocument = HydratedDocument<MigrationRecord>;

export const MigrationRecordSchema = SchemaFactory.createForClass(MigrationRecord);
