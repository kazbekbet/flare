import { describe, expect, it } from 'vitest';

import { decodeQrPayload, encodeQrPayload } from './qr-payload.js';

describe('qr-payload', () => {
  it('encodeQrPayload возвращает валидный JSON, который парсится decodeQrPayload', () => {
    const payload = { v: 1 as const, uid: 'abc123', name: 'Alice' };
    const encoded = encodeQrPayload(payload);
    expect(JSON.parse(encoded)).toMatchObject(payload);
    expect(decodeQrPayload(encoded)).toEqual(payload);
  });

  it('decodeQrPayload бросает при невалидном JSON', () => {
    expect(() => decodeQrPayload('not-a-json')).toThrow();
  });

  it('decodeQrPayload бросает при несоответствии схеме (отсутствует uid)', () => {
    expect(() => decodeQrPayload(JSON.stringify({ v: 1, name: 'X' }))).toThrow();
  });

  it('decodeQrPayload бросает при неверной версии', () => {
    expect(() => decodeQrPayload(JSON.stringify({ v: 2, uid: 'x', name: 'Y' }))).toThrow();
  });
});
