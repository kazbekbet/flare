import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { env } from '@shared/config';

/**
 * Имя события, диспатчащегося в `window` при ответе 401 от API.
 * Подписка — в `entities/session` (там же выполняется logout + clear IndexedDB).
 */
export const UNAUTHORIZED_EVENT = 'flare:unauthorized';

/**
 * Оболочка RTK-state с сессией — нужна prepareHeaders,
 * чтобы не тянуть циклическую зависимость с `entities/session`.
 */
interface StateWithAccessToken {
  session: { accessToken: string | null };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAccessToken).session.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * `BaseQueryFn`-обёртка, эмитящая `UNAUTHORIZED_EVENT` при 401.
 * Позволяет entities/session сделать logout + чистку IndexedDB без
 * прямой зависимости `shared → entities`.
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
  }
  return result;
};

/**
 * Корневое RTK Query API.
 * Эндпоинты инжектятся из `entities/*` и `features/*` через `injectEndpoints` —
 * один общий кэш и один middleware, но доменная логика остаётся в каждом слайсе.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Me', 'Friendship'],
  endpoints: () => ({}),
});
