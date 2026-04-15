import React from 'react';

import { selectIsAuthenticated } from '@entities/session';
import { useSelector } from 'react-redux';

/**
 * Пропсы `ProtectedRoute`.
 *
 * @prop {React.ReactNode} children - Защищённое содержимое.
 * @prop {() => void} onUnauthenticated - Вызывается если пользователь не залогинен
 *   (типично — `navigate({ to: '/auth' })`).
 */
export interface ProtectedRouteProps {
  children: React.ReactNode;
  onUnauthenticated: () => void;
}

/**
 * Компонент-обёртка: если пользователь не аутентифицирован, вызывает колбек
 * редиректа и ничего не рендерит. Иначе — отдаёт children.
 */
export function ProtectedRoute({ children, onUnauthenticated }: ProtectedRouteProps) {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  React.useEffect(() => {
    if (!isAuthenticated) onUnauthenticated();
  }, [isAuthenticated, onUnauthenticated]);

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
