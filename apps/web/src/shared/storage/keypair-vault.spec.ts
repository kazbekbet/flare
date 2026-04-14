import { beforeEach, describe, expect, it } from 'vitest';

import { clearStoredKey, hasStoredKey, loadPrivateKey, storePrivateKey } from './keypair-vault.js';

const SAMPLE_PRIVATE_KEY = 'dGVzdC1wcml2YXRlLWtleS1pbi1iYXNlNjQ='; // «test-private-key-in-base64»
const PIN = '123456';

describe('keypair-vault', () => {
  beforeEach(async () => {
    await clearStoredKey();
  });

  it('round-trip: storePrivateKey + loadPrivateKey с тем же PIN возвращает исходные данные', async () => {
    await storePrivateKey(SAMPLE_PRIVATE_KEY, PIN);
    const loaded = await loadPrivateKey(PIN);
    expect(loaded).toBe(SAMPLE_PRIVATE_KEY);
  });

  it('loadPrivateKey с неверным PIN бросает ошибку AES-GCM', async () => {
    await storePrivateKey(SAMPLE_PRIVATE_KEY, PIN);
    await expect(loadPrivateKey('999999')).rejects.toThrow();
  });

  it('hasStoredKey возвращает true только после сохранения', async () => {
    expect(await hasStoredKey()).toBe(false);
    await storePrivateKey(SAMPLE_PRIVATE_KEY, PIN);
    expect(await hasStoredKey()).toBe(true);
  });

  it('clearStoredKey удаляет запись из IndexedDB', async () => {
    await storePrivateKey(SAMPLE_PRIVATE_KEY, PIN);
    await clearStoredKey();
    expect(await hasStoredKey()).toBe(false);
    expect(await loadPrivateKey(PIN)).toBeNull();
  });
});
