import { baseApi, unwrapEnvelope } from '@shared/api';

/** Представление переписки, возвращаемое сервером. */
export interface ConversationView {
  _id: string;
  type: 'DIRECT' | 'GROUP';
  memberIds: string[];
  lastMessage?: {
    encryptedContent: string;
    senderId: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Инжектированные эндпоинты `conversations`.
 * Теги:
 *  - `Conversation` — провайдится `getConversations`.
 */
export const conversationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getConversations: build.query<ConversationView[], void>({
      query: () => ({ url: '/conversations' }),
      transformResponse: unwrapEnvelope<ConversationView[]>,
      providesTags: ['Conversation'],
    }),
  }),
});

export const { useGetConversationsQuery } = conversationApi;
