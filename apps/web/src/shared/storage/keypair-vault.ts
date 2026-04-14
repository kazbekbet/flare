import { del, get, set } from 'idb-keyval';

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

/** Количество итераций PBKDF2. */
const PBKDF2_ITERATIONS = 150_000;

/**
 * Выводит 256-битный AES-ключ из PIN-кода пользователя через PBKDF2-SHA256.
 *
 * @param pin - PIN-код.
 * @param salt - Salt (случайные 16 байт).
 * @returns CryptoKey, пригодный для AES-GCM.
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
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
  const key = await deriveKeyFromPin(pin, salt);
  const plaintext = new TextEncoder().encode(privateKeyBase64);
  const buffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  );
  const record: EncryptedKeyRecord = {
    iv,
    salt,
    ciphertext: new Uint8Array(buffer),
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
  const key = await deriveKeyFromPin(pin, record.salt);
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: record.iv as unknown as BufferSource },
    key,
    record.ciphertext as unknown as BufferSource,
  );
  return new TextDecoder().decode(buffer);
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
