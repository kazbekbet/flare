import { authenticated, sessionReducer } from '@entities/session';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '@shared/api';
import { clearStoredKey, hasStoredKey, loadPrivateKey } from '@shared/storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { performRegister } from './register.thunk';

/**
 * Мок `fetch` для RTK Query baseQuery.
 * Возвращает успешный ответ от `POST /auth/register`.
 */
function mockRegisterFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              userId: 'user-42',
              accessToken: 'jwt-access',
              accessTokenExpiresIn: 900,
            },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    ),
  );
}

function buildStore() {
  return configureStore({
    reducer: {
      session: sessionReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

describe('performRegister (RTK Query + side effects)', () => {
  beforeEach(async () => {
    await clearStoredKey();
    vi.unstubAllGlobals();
  });

  it('генерирует keypair, вызывает мутацию, шифрует приватный ключ и обновляет сессию', async () => {
    mockRegisterFetch();
    const store = buildStore();
    const spy = vi.spyOn(store, 'dispatch');

    const userId = await performRegister(
      { displayName: 'Alice', pin: '123456' },
      store.dispatch as Parameters<typeof performRegister>[1],
    );

    expect(userId).toBe('user-42');

    // Приватный ключ зашифрован и сохранён.
    expect(await hasStoredKey()).toBe(true);
    const decrypted = await loadPrivateKey('123456');
    expect(decrypted).toMatch(/^[A-Za-z0-9+/]+=*$/);

    // В сессии появился accessToken и displayName.
    const state = store.getState();
    expect(state.session.accessToken).toBe('jwt-access');
    expect(state.session.userId).toBe('user-42');
    expect(state.session.displayName).toBe('Alice');
    expect(state.session.isUnlocked).toBe(true);

    // Проверяем, что был диспатчен `authenticated` action.
    const authCall = spy.mock.calls.find((c) => {
      const action = c[0] as { type?: string };
      return typeof action === 'object' && action?.type === authenticated.type;
    });
    expect(authCall).toBeDefined();
  });
});
