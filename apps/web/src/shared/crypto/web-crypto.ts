/**
 * Typed wrappers around the Web Crypto API.
 * All `as unknown as BufferSource` casts are concentrated here so the rest of
 * the codebase works with plain TypedArrays.
 *
 * This module is web-only (uses `window.crypto.subtle`) and must NOT be moved
 * to packages/shared which is isomorphic.
 */

const subtle = crypto.subtle;

/** Number of PBKDF2 iterations used when deriving keys from a PIN. */
export const PBKDF2_ITERATIONS = 150_000;

/**
 * Derives a 256-bit AES-GCM key from a user-supplied PIN via PBKDF2-SHA256.
 *
 * @param pin  - User PIN string.
 * @param salt - Random 16-byte salt.
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
 * Encrypts plaintext with AES-GCM.
 *
 * @param plaintext - Raw bytes to encrypt.
 * @param key       - AES-GCM CryptoKey (encrypt usage).
 * @param iv        - 12-byte initialisation vector.
 * @returns Ciphertext as a new Uint8Array.
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
 * Decrypts ciphertext with AES-GCM.
 *
 * @param ciphertext - Encrypted bytes.
 * @param key        - AES-GCM CryptoKey (decrypt usage).
 * @param iv         - 12-byte initialisation vector used during encryption.
 * @returns Plaintext as a new Uint8Array.
 */
export async function decryptAesGcm(ciphertext: Uint8Array, key: CryptoKey, iv: Uint8Array): Promise<Uint8Array> {
  const buffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  );
  return new Uint8Array(buffer);
}
