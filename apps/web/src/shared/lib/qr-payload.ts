import { z } from 'zod';

/**
 * Zod-схема payload-а QR-кода для добавления в друзья.
 *
 * @prop {1} v - Версия формата.
 * @prop {string} uid - UUID/ObjectId пользователя.
 * @prop {string} name - Отображаемое имя.
 */
export const QrPayloadSchema = z.object({
  v: z.literal(1),
  uid: z.string().min(1),
  name: z.string().min(1),
});

/** Тип payload-а QR-кода. */
export type QrPayload = z.infer<typeof QrPayloadSchema>;

/**
 * Сериализует payload в JSON-строку для встраивания в QR-код.
 *
 * @param payload - Объект payload-а.
 * @returns Компактная JSON-строка.
 */
export function encodeQrPayload(payload: QrPayload): string {
  return JSON.stringify(payload);
}

/**
 * Парсит и валидирует строку, прочитанную из QR-кода.
 *
 * @param raw - Сырая строка.
 * @returns Распарсенный payload.
 * @throws Если JSON невалиден или схема не сошлась.
 */
export function decodeQrPayload(raw: string): QrPayload {
  const parsed = JSON.parse(raw) as unknown;
  return QrPayloadSchema.parse(parsed);
}
