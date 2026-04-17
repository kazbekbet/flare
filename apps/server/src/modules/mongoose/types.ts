/**
 * Расширяет тип Mongoose-документа полями временных меток, добавляемых при `{ timestamps: true }`.
 * Использовать вместо inline-приведения `& { createdAt: Date; updatedAt: Date }`.
 */
export type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };
