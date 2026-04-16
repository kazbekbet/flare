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
 * Discriminated union describing API error categories.
 *
 * @prop kind - 'unauthorized' | 'validation' | 'server' | 'network'
 * @prop status - HTTP status code (undefined for network errors)
 * @prop message - Human-readable description
 */
export type ApiError =
  | { kind: 'unauthorized'; status: 401; message: string }
  | { kind: 'validation'; status: 400 | 422; message: string }
  | { kind: 'server'; status: number; message: string }
  | { kind: 'network'; status: undefined; message: string };

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

function categorizeError(error: FetchBaseQueryError, url: string): ApiError {
  if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR' || error.status === 'CUSTOM_ERROR') {
    return {
      kind: 'network',
      status: undefined,
      message: String((error as { error?: string }).error ?? 'Network error'),
    };
  }
  const status = error.status as number;
  if (status === 401) return { kind: 'unauthorized', status: 401, message: 'Unauthorized' };
  if (status === 400 || status === 422)
    return { kind: 'validation', status: status as 400 | 422, message: 'Validation error' };
  if (status >= 500) {
    window.dispatchEvent(new CustomEvent('api:server-error', { detail: { status, url } }));
    return { kind: 'server', status, message: `Server error ${status}` };
  }
  return { kind: 'server', status, message: `Unexpected error ${status}` };
}

/**
 * `BaseQueryFn`-обёртка:
 * - Эмитит `UNAUTHORIZED_EVENT` при 401 (logout).
 * - Эмитит `api:server-error` CustomEvent при 5xx для глобального toast-хендлера.
 * - Categorizes errors into the ApiError discriminated union (accessible via result.error).
 */
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const url = typeof args === 'string' ? args : (args.url ?? '');
    const categorized = categorizeError(result.error, url);
    if (categorized.kind === 'unauthorized') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
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
