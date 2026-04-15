import { lazy, Suspense } from 'react';

import { store } from '@app/store';
import { LoadingOverlay } from '@mantine/core';
import { ROUTES } from '@shared/config';
import { createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from '@tanstack/react-router';

const AuthPage = lazy(() => import('@pages/auth-page').then((m) => ({ default: m.AuthPage })));
const ChatsPage = lazy(() => import('@pages/chats-page').then((m) => ({ default: m.ChatsPage })));
const FriendsPage = lazy(() => import('@pages/friends-page').then((m) => ({ default: m.FriendsPage })));
const SettingsPage = lazy(() => import('@pages/settings-page').then((m) => ({ default: m.SettingsPage })));

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
  component: () => <AuthPage onRegistered={() => router.navigate({ to: ROUTES.chats })} />,
});

const chatsRoute = createRoute({
  path: ROUTES.chats,
  getParentRoute: () => rootRoute,
  beforeLoad: requireAuthenticated,
  component: ChatsPage,
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

const routeTree = rootRoute.addChildren([indexRoute, authRoute, chatsRoute, friendsRoute, settingsRoute]);

/** Инстанс TanStack Router. */
export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

/**
 * Провайдер роутера приложения.
 */
export function AppRouterProvider() {
  return <RouterProvider router={router} />;
}
