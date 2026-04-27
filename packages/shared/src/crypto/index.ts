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
 * Шифрует текстовое сообщение для получателя (NaCl box — X25519 + XSalsa20-Poly1305).
 *
 * @param plaintext - Открытый текст сообщения.
 * @param recipientPubKeyB64 - Публичный ключ получателя в Base64.
 * @param senderPrivKeyB64 - Приватный ключ отправителя в Base64.
 * @returns Объект с зашифрованным текстом и nonce в Base64.
 */
export function encryptMessage(
  plaintext: string,
  recipientPubKeyB64: string,
  senderPrivKeyB64: string,
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = naclUtil.decodeUTF8(plaintext);
  const recipientPubKey = decodeBase64(recipientPubKeyB64);
  const senderPrivKey = decodeBase64(senderPrivKeyB64);

  const encrypted = nacl.box(messageBytes, nonce, recipientPubKey, senderPrivKey);

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Расшифровывает текстовое сообщение от отправителя (NaCl box.open).
 *
 * @param ciphertextB64 - Зашифрованный текст в Base64.
 * @param nonceB64 - Nonce в Base64.
 * @param senderPubKeyB64 - Публичный ключ отправителя в Base64.
 * @param recipientPrivKeyB64 - Приватный ключ получателя в Base64.
 * @returns Расшифрованный открытый текст.
 * @throws {Error} Если расшифровка не удалась (неверный ключ или повреждённые данные).
 */
export function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  senderPubKeyB64: string,
  recipientPrivKeyB64: string,
): string {
  const ciphertext = decodeBase64(ciphertextB64);
  const nonce = decodeBase64(nonceB64);
  const senderPubKey = decodeBase64(senderPubKeyB64);
  const recipientPrivKey = decodeBase64(recipientPrivKeyB64);

  const decrypted = nacl.box.open(ciphertext, nonce, senderPubKey, recipientPrivKey);

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return naclUtil.encodeUTF8(decrypted);
}

/**
 * Шифрует симметричный ключ медиафайла для получателя (NaCl box).
 *
 * @param mediaKey - Симметричный ключ в виде сырых байтов.
 * @param recipientPubKeyB64 - Публичный ключ получателя в Base64.
 * @param senderPrivKeyB64 - Приватный ключ отправителя в Base64.
 * @returns Объект с зашифрованным ключом и nonce в Base64.
 */
export function encryptMediaKey(
  mediaKey: Uint8Array,
  recipientPubKeyB64: string,
  senderPrivKeyB64: string,
): { encryptedKey: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPubKey = decodeBase64(recipientPubKeyB64);
  const senderPrivKey = decodeBase64(senderPrivKeyB64);

  const encrypted = nacl.box(mediaKey, nonce, recipientPubKey, senderPrivKey);

  return {
    encryptedKey: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Расшифровывает симметричный ключ медиафайла (NaCl box.open).
 *
 * @param encryptedKeyB64 - Зашифрованный ключ в Base64.
 * @param nonceB64 - Nonce в Base64.
 * @param senderPubKeyB64 - Публичный ключ отправителя в Base64.
 * @param recipientPrivKeyB64 - Приватный ключ получателя в Base64.
 * @returns Расшифрованный симметричный ключ в виде сырых байтов.
 * @throws {Error} Если расшифровка не удалась.
 */
export function decryptMediaKey(
  encryptedKeyB64: string,
  nonceB64: string,
  senderPubKeyB64: string,
  recipientPrivKeyB64: string,
): Uint8Array {
  const encryptedKey = decodeBase64(encryptedKeyB64);
  const nonce = decodeBase64(nonceB64);
  const senderPubKey = decodeBase64(senderPubKeyB64);
  const recipientPrivKey = decodeBase64(recipientPrivKeyB64);

  const decrypted = nacl.box.open(encryptedKey, nonce, senderPubKey, recipientPrivKey);

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return decrypted;
}

/**
 * Симметричное шифрование медиаданных (NaCl secretbox — XSalsa20-Poly1305).
 *
 * @param data - Сырые байты медиафайла.
 * @param key - Симметричный ключ (32 байта).
 * @returns Объект с зашифрованными данными и nonce.
 */
export function encryptMedia(data: Uint8Array, key: Uint8Array): { encrypted: Uint8Array; nonce: Uint8Array } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const encrypted = nacl.secretbox(data, nonce, key);

  return { encrypted, nonce };
}

/**
 * Симметричная расшифровка медиаданных (NaCl secretbox.open).
 *
 * @param encrypted - Зашифрованные байты.
 * @param nonce - Nonce, использованный при шифровании.
 * @param key - Симметричный ключ (32 байта).
 * @returns Расшифрованные сырые байты.
 * @throws {Error} Если расшифровка не удалась.
 */
export function decryptMedia(encrypted: Uint8Array, nonce: Uint8Array, key: Uint8Array): Uint8Array {
  const decrypted = nacl.secretbox.open(encrypted, nonce, key);

  if (!decrypted) {
    throw new Error('Decryption failed');
  }

  return decrypted;
}

/**
 * Вычисляет Ed25519-подпись для challenge-авторизации.
 * Из 32-байтного X25519-приватного ключа (seed) выводится Ed25519-keypair,
 * после чего подписывается строковое представление timestamp.
 *
 * @param privateKeyB64 - Base64-encoded X25519 приватный ключ (32 байта), используемый как seed.
 * @param timestamp - Unix-timestamp в секундах.
 * @returns Base64-encoded Ed25519-подпись.
 */
export function signChallenge(privateKeyB64: string, timestamp: number): string {
  const seed = decodeBase64(privateKeyB64);
  const signingKeyPair = nacl.sign.keyPair.fromSeed(seed);
  const message = naclUtil.decodeUTF8(String(timestamp));
  const signature = nacl.sign.detached(message, signingKeyPair.secretKey);

  return encodeBase64(signature);
}

/**
 * Проверяет Ed25519-подпись challenge-авторизации.
 * Помимо криптографической верификации, отклоняет timestamp старше 60 секунд
 * (защита от replay-атак).
 *
 * @param publicKeyB64 - Base64-encoded Ed25519 публичный ключ подписи (32 байта).
 * @param signatureB64 - Base64-encoded подпись, полученная из {@link signChallenge}.
 * @param timestamp - Unix-timestamp в секундах, который был подписан.
 * @returns `true`, если подпись валидна и timestamp свежий.
 */
export function verifyChallenge(publicKeyB64: string, signatureB64: string, timestamp: number): boolean {
  const now = Math.floor(Date.now() / 1000);

  if (Math.abs(now - timestamp) > 60) return false;

  const message = naclUtil.decodeUTF8(String(timestamp));
  const signature = decodeBase64(signatureB64);
  const publicKey = decodeBase64(publicKeyB64);

  try {
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch {
    return false;
  }
}

/**
 * Выводит Ed25519 публичный ключ подписи из X25519 приватного ключа (seed).
 * Результат сохраняется на сервере при регистрации для последующей
 * верификации challenge-подписей через {@link verifyChallenge}.
 *
 * @param privateKeyB64 - Base64-encoded X25519 приватный ключ (32 байта).
 * @returns Base64-encoded Ed25519 публичный ключ подписи.
 */
export function deriveSigningPublicKey(privateKeyB64: string): string {
  const seed = decodeBase64(privateKeyB64);
  const signingKeyPair = nacl.sign.keyPair.fromSeed(seed);

  return encodeBase64(signingKeyPair.publicKey);
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
