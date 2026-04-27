import nacl from 'tweetnacl';
import { describe, expect, it } from 'vitest';

import {
  decryptMedia,
  decryptMediaKey,
  decryptMessage,
  deriveSigningPublicKey,
  encryptMedia,
  encryptMediaKey,
  encryptMessage,
  generateIdentityKeypair,
  signChallenge,
  verifyChallenge,
} from './index.js';

/** Шаблон корректной Base64-строки без URL-safe символов. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+=*$/;

describe('generateIdentityKeypair', () => {
  it('возвращает пару ключей в Base64', () => {
    const kp = generateIdentityKeypair();
    expect(kp.publicKey).toMatch(BASE64_PATTERN);
    expect(kp.privateKey).toMatch(BASE64_PATTERN);
  });

  it('публичный и приватный ключи — 32 байта после декодирования', () => {
    const kp = generateIdentityKeypair();
    // 32 байта в Base64 → 44 символа (с паддингом `=`).
    expect(kp.publicKey).toHaveLength(44);
    expect(kp.privateKey).toHaveLength(44);
  });

  it('генерирует разные пары при каждом вызове', () => {
    const a = generateIdentityKeypair();
    const b = generateIdentityKeypair();
    expect(a.publicKey).not.toEqual(b.publicKey);
    expect(a.privateKey).not.toEqual(b.privateKey);
  });
});

describe('encryptMessage / decryptMessage', () => {
  it('шифрование → расшифровка возвращает исходный текст', () => {
    const alice = generateIdentityKeypair();
    const bob = generateIdentityKeypair();
    const plaintext = 'Привет, мир! Hello, world! 🔥';

    const { ciphertext, nonce } = encryptMessage(plaintext, bob.publicKey, alice.privateKey);
    const decrypted = decryptMessage(ciphertext, nonce, alice.publicKey, bob.privateKey);

    expect(decrypted).toBe(plaintext);
  });

  it('расшифровка с неверным ключом выбрасывает ошибку', () => {
    const alice = generateIdentityKeypair();
    const bob = generateIdentityKeypair();
    const eve = generateIdentityKeypair();

    const { ciphertext, nonce } = encryptMessage('секрет', bob.publicKey, alice.privateKey);

    expect(() => decryptMessage(ciphertext, nonce, alice.publicKey, eve.privateKey)).toThrow('Decryption failed');
  });
});

describe('encryptMediaKey / decryptMediaKey', () => {
  it('шифрование → расшифровка возвращает исходный ключ', () => {
    const alice = generateIdentityKeypair();
    const bob = generateIdentityKeypair();
    const mediaKey = nacl.randomBytes(nacl.secretbox.keyLength);

    const { encryptedKey, nonce } = encryptMediaKey(mediaKey, bob.publicKey, alice.privateKey);
    const decrypted = decryptMediaKey(encryptedKey, nonce, alice.publicKey, bob.privateKey);

    expect(decrypted).toEqual(mediaKey);
  });
});

describe('encryptMedia / decryptMedia', () => {
  it('шифрование → расшифровка возвращает исходные данные', () => {
    const key = nacl.randomBytes(nacl.secretbox.keyLength);
    const data = nacl.randomBytes(1024);

    const { encrypted, nonce } = encryptMedia(data, key);
    const decrypted = decryptMedia(encrypted, nonce, key);

    expect(decrypted).toEqual(data);
  });

  it('расшифровка с неверным ключом выбрасывает ошибку', () => {
    const key = nacl.randomBytes(nacl.secretbox.keyLength);
    const wrongKey = nacl.randomBytes(nacl.secretbox.keyLength);
    const data = nacl.randomBytes(256);

    const { encrypted, nonce } = encryptMedia(data, key);

    expect(() => decryptMedia(encrypted, nonce, wrongKey)).toThrow('Decryption failed');
  });
});

describe('signChallenge / verifyChallenge', () => {
  it('подпись проходит верификацию с корректным ключом и свежим timestamp', () => {
    const { privateKey } = generateIdentityKeypair();
    const signingPubKey = deriveSigningPublicKey(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = signChallenge(privateKey, timestamp);
    const result = verifyChallenge(signingPubKey, signature, timestamp);

    expect(result).toBe(true);
  });

  it('подделанная подпись отклоняется', () => {
    const { privateKey } = generateIdentityKeypair();
    const signingPubKey = deriveSigningPublicKey(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);

    const signature = signChallenge(privateKey, timestamp);

    // Портим последние символы подписи
    const tampered = signature.slice(0, -2) + 'AA';
    const result = verifyChallenge(signingPubKey, tampered, timestamp);

    expect(result).toBe(false);
  });

  it('timestamp старше 60 секунд отклоняется', () => {
    const { privateKey } = generateIdentityKeypair();
    const signingPubKey = deriveSigningPublicKey(privateKey);
    const oldTimestamp = Math.floor(Date.now() / 1000) - 120;

    const signature = signChallenge(privateKey, oldTimestamp);
    const result = verifyChallenge(signingPubKey, signature, oldTimestamp);

    expect(result).toBe(false);
  });

  it('deriveSigningPublicKey возвращает стабильный результат для одного ключа', () => {
    const { privateKey } = generateIdentityKeypair();

    const pub1 = deriveSigningPublicKey(privateKey);
    const pub2 = deriveSigningPublicKey(privateKey);

    expect(pub1).toBe(pub2);
  });
});
