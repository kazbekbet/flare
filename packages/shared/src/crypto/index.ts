import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const { decodeBase64, encodeBase64 } = naclUtil;

/**
 * Identity-keypair пользователя.
 * Публичный ключ отправляется на сервер, приватный — хранится только на устройстве,
 * зашифрованный PIN-кодом в IndexedDB.
 *
 * @prop {string} publicKey - Base64-encoded X25519 публичный ключ (32 байта).
 * @prop {string} privateKey - Base64-encoded X25519 приватный ключ (32 байта).
 */
export interface IdentityKeypair {
  publicKey: string;
  privateKey: string;
}

/**
 * Генерирует новую пару X25519 ключей для E2E-шифрования.
 * Вызывается один раз на устройстве при регистрации. Приватный ключ никогда
 * не покидает устройство.
 *
 * @returns Пара ключей в Base64.
 */
export function generateIdentityKeypair(): IdentityKeypair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    privateKey: encodeBase64(kp.secretKey),
  };
}

/**
 * Вспомогательная утилита: SHA-256-хэш и отображение первых 8 байт в hex.
 * Используется в настройках как fingerprint публичного ключа для out-of-band верификации
 * (TOFU-модель, как в Signal).
 *
 * @param publicKeyBase64 - Публичный ключ в Base64.
 * @returns Промис с fingerprint-строкой в формате `aa:bb:cc:...`.
 */
export async function publicKeyFingerprint(publicKeyBase64: string): Promise<string> {
  const bytes = decodeBase64(publicKeyBase64);
  // Копируем байты в свежий ArrayBuffer — Uint8Array из tweetnacl-util
  // декларирован как Uint8Array<ArrayBufferLike>, что несовместимо с BufferSource в TS 5.x.
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const view = new Uint8Array(digest).slice(0, 8);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');
}
