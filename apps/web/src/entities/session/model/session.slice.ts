import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Состояние текущей сессии пользователя.
 *
 * @prop {string | null} userId - ID текущего пользователя (null — не аутентифицирован).
 * @prop {string | null} displayName - Отображаемое имя.
 * @prop {string | null} publicKey - Собственный публичный ключ.
 * @prop {string | null} accessToken - JWT access-токен.
 * @prop {boolean} isUnlocked - Разблокирован ли приватный ключ в памяти.
 * @prop {string | null} privateKey - Приватный ключ в памяти (Base64, только когда isUnlocked=true).
 */
export interface SessionState {
  userId: string | null;
  displayName: string | null;
  publicKey: string | null;
  accessToken: string | null;
  isUnlocked: boolean;
  privateKey: string | null;
}

const initialState: SessionState = {
  userId: null,
  displayName: null,
  publicKey: null,
  accessToken: null,
  isUnlocked: false,
  privateKey: null,
};

/**
 * Payload события успешной регистрации/аутентификации.
 */
export interface AuthenticatedPayload {
  userId: string;
  displayName: string;
  publicKey: string;
  privateKey: string;
  accessToken: string;
}

/**
 * RTK-slice сессии. Приватный ключ хранится в state только после разблокировки PIN-ом
 * и очищается при logout / lock.
 */
export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    authenticated(state, action: PayloadAction<AuthenticatedPayload>) {
      state.userId = action.payload.userId;
      state.displayName = action.payload.displayName;
      state.publicKey = action.payload.publicKey;
      state.privateKey = action.payload.privateKey;
      state.accessToken = action.payload.accessToken;
      state.isUnlocked = true;
    },
    accessTokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
    },
    locked(state) {
      state.isUnlocked = false;
      state.privateKey = null;
    },
    loggedOut() {
      return initialState;
    },
  },
});

export const { accessTokenRefreshed, authenticated, loggedOut, locked } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
