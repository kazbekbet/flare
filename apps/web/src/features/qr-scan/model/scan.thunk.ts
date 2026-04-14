import { type FriendshipView,sendFriendRequest } from '../../../entities/friendship/index.js';
import { fetchPublicKey } from '../../../entities/user/index.js';
import { decodeQrPayload } from '../../../shared/lib/index.js';

/**
 * Результат успешного сканирования: сгенерированный запрос дружбы + публичный ключ адресата.
 */
export interface ScanResult {
  friendship: FriendshipView;
  addresseePublicKey: string;
  addresseeName: string;
}

/**
 * Обрабатывает текст, прочитанный из QR-кода:
 * 1. Парсит payload (валидация через Zod).
 * 2. Запрашивает публичный ключ адресата (для будущего E2E).
 * 3. Отправляет запрос дружбы.
 *
 * @param rawQrText - Сырая строка из QR.
 * @returns Результат сканирования.
 */
export async function processScannedQr(rawQrText: string): Promise<ScanResult> {
  const payload = decodeQrPayload(rawQrText);
  const keyResponse = await fetchPublicKey(payload.uid);
  const friendship = await sendFriendRequest({ addresseeId: payload.uid });
  return { friendship, addresseePublicKey: keyResponse.publicKey, addresseeName: payload.name };
}
