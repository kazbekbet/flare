/**
 * Константы путей приложения.
 * Используются как в TanStack Router, так и в `<Link>`/navigate.
 */
export const ROUTES = {
  auth: '/auth',
  chats: '/chats',
  chat: (id: string) => `/chats/${id}`,
  friends: '/friends',
  settings: '/settings',
} as const;
