import { store } from '@app/store';
import { AuthPage } from '@pages/auth-page';
import { ChatsPage } from '@pages/chats-page';
import { FriendsPage } from '@pages/friends-page';
import { SettingsPage } from '@pages/settings-page';
import { ROUTES } from '@shared/config';
import { createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from '@tanstack/react-router';

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

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const authRoute = createRoute({
  path: ROUTES.auth,
  getParentRoute: () => rootRoute,
  component: () => <AuthPage onRegistered={() => window.location.assign(ROUTES.chats)} />,
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
