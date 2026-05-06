import { baseApi, unwrapEnvelope } from '@shared/api';

import type { MessageView } from '../types';

/** Параметры запроса списка сообщений переписки. */
interface GetMessagesParams {
  conversationId: string;
  cursor?: string;
  limit?: number;
}

/**
 * Инжектированные эндпоинты `messages`.
 * Теги:
 *  - `Message` — провайдится `getMessages` по `conversationId`.
 */
export const messageApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMessages: build.query<MessageView[], GetMessagesParams>({
      query: ({ conversationId, cursor, limit }) => ({
        url: `/conversations/${conversationId}/messages`,
        params: { cursor, limit },
      }),
      transformResponse: unwrapEnvelope<MessageView[]>,
      providesTags: (_result, _error, { conversationId }) => [{ type: 'Message', id: conversationId }],
    }),
  }),
});

export const { useGetMessagesQuery } = messageApi;
