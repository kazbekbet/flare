import { describe, expect, it } from 'vitest';

import { generateIdentityKeypair } from './index.js';

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
