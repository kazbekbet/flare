/**
 * Augments a Mongoose document type with the timestamp fields added by `{ timestamps: true }`.
 * Use instead of inline `& { createdAt: Date; updatedAt: Date }` casts.
 */
export type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };
