import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@app/store';
import { accessTokenRefreshed, selectIsAuthenticated } from '@entities/session';
import { hasStoredKey } from '@shared/storage';

import { refreshApi } from '../api/refresh.api';

/**
 * Результат хука `useAuthStartup`.
 *
 * @prop {boolean} isLoading - true, пока идёт попытка refresh.
 * @prop {boolean} isAuthenticated - true, если access-токен получен.
 * @prop {boolean} hasKey - true, если в IndexedDB есть сохранённый приватный ключ.
 */
export interface AuthStartupResult {
  isLoading: boolean;
  isAuthenticated: boolean;
  hasKey: boolean;
}

/**
 * Хук начальной загрузки аутентификации.
 *
 * При монтировании выполняет `POST /auth/refresh` (httpOnly cookie).
 * - Успех: диспатчит `accessTokenRefreshed`, устанавливает `isAuthenticated`.
 * - Ошибка: проверяет наличие ключа в IndexedDB для выбора режима (вход/регистрация).
 *
 * @returns Объект с `isLoading`, `isAuthenticated` и `hasKey`.
 */
export function useAuthStartup(): AuthStartupResult {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        const result = await dispatch(refreshApi.endpoints.refresh.initiate()).unwrap();

        if (!cancelled) {
          dispatch(accessTokenRefreshed(result.accessToken));
        }
      } catch {
        // Refresh не удался — проверяем IndexedDB.
        if (!cancelled) {
          const keyExists = await hasStoredKey();
          setHasKey(keyExists);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    tryRefresh();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return { isLoading, isAuthenticated, hasKey };
}
