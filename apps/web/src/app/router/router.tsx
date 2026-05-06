import { createContext, lazy, Suspense, useContext, useEffect } from 'react';

import { store } from '@app/store';
import { useAuthStartup } from '@features/auth-refresh';
import { LoadingOverlay } from '@mantine/core';
import { ROUTES } from '@shared/config';
import { createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from '@tanstack/react-router';

const AuthPage = lazy(() => import('@pages/auth-page').then((m) => ({ default: m.AuthPage })));
const ChatDetailPage = lazy(() => import('@pages/chat-detail-page').then((m) => ({ default: m.ChatDetailPage })));
const ChatsPage = lazy(() => import('@pages/chats-page').then((m) => ({ default: m.ChatsPage })));
const FriendsPage = lazy(() => import('@pages/friends-page').then((m) => ({ default: m.FriendsPage })));
const SettingsPage = lazy(() => import('@pages/settings-page').then((m) => ({ default: m.SettingsPage })));

/* ───────────────────── Auth startup context ───────────────────── */

/**
 * Контекст стартовой информации об аутентификации.
 *
 * @prop {boolean} hasKey - true, если в IndexedDB есть сохранённый приватный ключ.
 */
interface AuthStartupContextValue {
  hasKey: boolean;
}

const AuthStartupContext = createContext<AuthStartupContextValue>({ hasKey: false });

/**
 * Хук для получения стартовой информации об аутентификации.
 * Используется в AuthPage для выбора начального режима (вход/регистрация).
 *
 * @returns Объект с `hasKey`.
 */
export function useAuthStartupContext(): AuthStartupContextValue {
  return useContext(AuthStartupContext);
}

/* ───────────────────── Router ───────────────────── */

/**
 * Guard — проверяет наличие access-токена в RTK-store.
 * Используется в `beforeLoad` защищённых роутов.
 */
function requireAuthenticated(): void {
  const state = store.getState();
  if (!state.session.accessToken) {
    throw redirect({ to: ROUTES.auth });
  }
}

const rootRoute = createRootRoute({
  component: () => (
    <Suspense fallback={<LoadingOverlay visible />}>
      <Outlet />
    </Suspense>
  ),
});

const authRoute = createRoute({
  path: ROUTES.auth,
  getParentRoute: () => rootRoute,
  component: () => <AuthPage onAuthenticated={() => router.navigate({ to: ROUTES.chats })} />,
});

const chatsRoute = createRoute({
  path: ROUTES.chats,
  getParentRoute: () => rootRoute,
  beforeLoad: requireAuthenticated,
  component: () => (
    <Suspense fallback={<LoadingOverlay visible />}>
      <Outlet />
    </Suspense>
  ),
});

const chatsIndexRoute = createRoute({
  path: '/',
  getParentRoute: () => chatsRoute,
  component: ChatsPage,
});

const chatDetailRoute = createRoute({
  path: '/$conversationId',
  getParentRoute: () => chatsRoute,
  component: ChatDetailPage,
});

const friendsRoute = createRoute({
  path: ROUTES.friends,
  getParentRoute: () => rootRoute,
  beforeLoad: requireAuthenticated,
  component: FriendsPage,
});

const settingsRoute = createRoute({
  path: ROUTES.settings,
  getParentRoute: () => rootRoute,
  beforeLoad: requireAuthenticated,
  component: SettingsPage,
});

const indexRoute = createRoute({
  path: '/',
  getParentRoute: () => rootRoute,
  beforeLoad: () => {
    const state = store.getState();
    throw redirect({ to: state.session.accessToken ? ROUTES.chats : ROUTES.auth });
  },
  component: () => null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  chatsRoute.addChildren([chatsIndexRoute, chatDetailRoute]),
  friendsRoute,
  settingsRoute,
]);

/** Инстанс TanStack Router. */
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Провайдер роутера приложения.
 * При монтировании выполняет попытку refresh access-токена (httpOnly cookie).
 * Пока refresh в процессе — показывает `LoadingOverlay`.
 * После завершения:
 * - Если refresh успешен — перенаправляет на `/chats`.
 * - Если есть ключ в IndexedDB — AuthPage покажет форму входа.
 * - Иначе — AuthPage покажет форму регистрации.
 */
export function AppRouterProvider() {
  const { isLoading, isAuthenticated, hasKey } = useAuthStartup();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.navigate({ to: ROUTES.chats });
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <LoadingOverlay visible />;
  }

  return (
    <AuthStartupContext.Provider value={{ hasKey }}>
      <RouterProvider router={router} />
    </AuthStartupContext.Provider>
  );
}
