/**
 * Типизированные обёртки над Web Crypto API.
 * Все приведения `as unknown as BufferSource` сосредоточены здесь,
 * чтобы остальной код работал с обычными TypedArray.
 *
 * Модуль предназначен только для браузера (использует `window.crypto.subtle`)
 * и не должен переноситься в packages/shared, который является изоморфным.
 */

const subtle = crypto.subtle;

/** Число итераций PBKDF2 при выведении ключа из PIN. */
export const PBKDF2_ITERATIONS = 150_000;

/**
 * Выводит 256-битный AES-GCM ключ из PIN-кода пользователя через PBKDF2-SHA256.
 *
 * @param pin  - PIN-строка пользователя.
 * @param salt - Случайная 16-байтная соль.
 */
export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await subtle.importKey('raw', new TextEncoder().encode(pin), { name: 'PBKDF2' }, false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
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
 * Шифрует данные алгоритмом AES-GCM.
 *
 * @param plaintext - Исходные байты для шифрования.
 * @param key       - CryptoKey AES-GCM (использование encrypt).
 * @param iv        - 12-байтный вектор инициализации.
 * @returns Зашифрованные данные в виде нового Uint8Array.
 */
export async function encryptAesGcm(plaintext: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const buffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintext as unknown as BufferSource,
  );
  return new Uint8Array(buffer);
}

/**
 * Расшифровывает данные алгоритмом AES-GCM.
 *
 * @param ciphertext - Зашифрованные байты.
 * @param key        - CryptoKey AES-GCM (использование decrypt).
 * @param iv         - 12-байтный вектор инициализации, использованный при шифровании.
 * @returns Расшифрованные данные в виде нового Uint8Array.
 */
export async function decryptAesGcm(ciphertext: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const buffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return new Uint8Array(buffer);
}
