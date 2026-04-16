import { del, get, set } from 'idb-keyval';

import { decryptAesGcm, deriveKey, encryptAesGcm } from '../crypto/web-crypto.js';

/** Ключ в IndexedDB под зашифрованный приватный ключ. */
const STORAGE_KEY = 'flare:identity:privateKey';

/**
 * Зашифрованная запись приватного ключа, хранимая в IndexedDB.
 * Сами данные защищены AES-GCM, ключ AES выведен из PIN через PBKDF2.
 *
 * @prop {Uint8Array} iv - Initialization vector AES-GCM (12 байт).
 * @prop {Uint8Array} salt - Salt PBKDF2 (16 байт).
 * @prop {Uint8Array} ciphertext - Зашифрованный приватный ключ.
 */
export interface EncryptedKeyRecord {
  iv: Uint8Array;
  salt: Uint8Array;
  ciphertext: Uint8Array;
}

/**
 * Шифрует приватный ключ PIN-кодом и сохраняет в IndexedDB.
 *
 * @param privateKeyBase64 - Приватный ключ в Base64.
 * @param pin - PIN-код пользователя.
 */
export async function storePrivateKey(privateKeyBase64: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const plaintext = new TextEncoder().encode(privateKeyBase64);
  const record: EncryptedKeyRecord = {
    iv,
    salt,
    ciphertext: await encryptAesGcm(plaintext, key, iv),
  };
  await set(STORAGE_KEY, record);
}

/**
 * Загружает и расшифровывает приватный ключ из IndexedDB.
 *
 * @param pin - PIN-код, которым ключ был зашифрован.
 * @returns Приватный ключ в Base64, либо `null` если записи нет.
 * @throws Ошибка если PIN неверный — AES-GCM не сможет расшифровать.
 */
export async function loadPrivateKey(pin: string): Promise<string | null> {
  const record = await get<EncryptedKeyRecord>(STORAGE_KEY);
  if (!record) return null;
  const key = await deriveKey(pin, record.salt);
  const plaintext = await decryptAesGcm(record.ciphertext, key, record.iv);
  return new TextDecoder().decode(plaintext);
}

/**
 * Проверяет, сохранён ли приватный ключ в IndexedDB (без попытки расшифровки).
 *
 * @returns true, если запись существует.
 */
export async function hasStoredKey(): Promise<boolean> {
  const record = await get<EncryptedKeyRecord>(STORAGE_KEY);
  return Boolean(record);
}

/**
 * Удаляет зашифрованный приватный ключ. Используется при logout.
 */
export function clearStoredKey(): Promise<void> {
  return del(STORAGE_KEY);
}
