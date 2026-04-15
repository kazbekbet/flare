import type { AppDispatch } from '@app/store';
import { friendshipApi, type FriendshipView } from '@entities/friendship';
import { userApi } from '@entities/user';
import { decodeQrPayload } from '@shared/lib';

/**
 * Результат успешного сканирования: сгенерированный запрос дружбы + публичный ключ адресата.
 *
 * @prop {FriendshipView} friendship - Созданная запись дружбы (в статусе PENDING).
 * @prop {string} addresseePublicKey - Base64 публичный ключ получателя (для последующего E2E).
 * @prop {string} addresseeName - Имя получателя из QR-payload.
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
 * Использует `initiate` RTK Query-эндпоинтов — результат кэшируется в общем store.
 *
 * @param rawQrText - Сырая строка из QR.
 * @param dispatch - Типизированный `AppDispatch`.
 * @returns Результат сканирования.
 */
export async function processScannedQr(rawQrText: string, dispatch: AppDispatch): Promise<ScanResult> {
  const payload = decodeQrPayload(rawQrText);
  const keyResponse = await dispatch(userApi.endpoints.getPublicKey.initiate(payload.uid)).unwrap();
  const friendship = await dispatch(
    friendshipApi.endpoints.sendFriendRequest.initiate({ addresseeId: payload.uid }),
  ).unwrap();
  return { friendship, addresseePublicKey: keyResponse.publicKey, addresseeName: payload.name };
}
