import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

import { authenticated, sessionReducer } from '../../entities/session/index.js';
import { ProtectedRoute } from './protected-route.js';

function renderWithStore(authenticatedState: boolean, onUnauth: () => void) {
  const store = configureStore({ reducer: { session: sessionReducer } });
  if (authenticatedState) {
    store.dispatch(
      authenticated({
        userId: 'u1',
        displayName: 'Alice',
        publicKey: 'pk',
        privateKey: 'sk',
        accessToken: 'tkn',
      }),
    );
  }
  return render(
    <Provider store={store}>
      <ProtectedRoute onUnauthenticated={onUnauth}>
        <div>secret</div>
      </ProtectedRoute>
    </Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('рендерит children, если пользователь аутентифицирован', () => {
    const onUnauth = vi.fn();
    renderWithStore(true, onUnauth);
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(onUnauth).not.toHaveBeenCalled();
  });

  it('вызывает onUnauthenticated и не рендерит children, если нет access-токена', () => {
    const onUnauth = vi.fn();
    renderWithStore(false, onUnauth);
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(onUnauth).toHaveBeenCalled();
  });
});
