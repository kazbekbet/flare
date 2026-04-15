import type { SessionState } from './session.slice';

/** Минимальный срез state, содержащий session (для типизации селекторов без зависимости на store.ts). */
interface StateWithSession {
  session: SessionState;
}

/**
 * Выбирает текущее состояние сессии целиком.
 *
 * @param state - Корневой state.
 * @returns SessionState.
 */
export const selectSession = (state: StateWithSession): SessionState => state.session;

/**
 * Признак наличия валидного access-токена (пользователь аутентифицирован).
 *
 * @param state - Корневой state.
 * @returns true если пользователь залогинен.
 */
export const selectIsAuthenticated = (state: StateWithSession): boolean => state.session.accessToken !== null;

/**
 * Признак разблокированного приватного ключа (можно шифровать/расшифровывать).
 *
 * @param state - Корневой state.
 * @returns true если ключ в памяти.
 */
export const selectIsUnlocked = (state: StateWithSession): boolean => state.session.isUnlocked;
