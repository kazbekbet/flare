import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { MessageView } from '../types';

/**
 * Состояние real-time сообщений, полученных через сокет.
 * Ключ — `conversationId`, значение — массив сообщений.
 */
type MessagesState = Record<string, MessageView[]>;

const initialState: MessagesState = {};

/**
 * RTK-slice для хранения сообщений, полученных в реальном времени через WebSocket.
 * Используется параллельно с RTK Query-кэшем: query грузит историю,
 * slice — накапливает новые входящие/исходящие сообщения.
 *
 * - `messageReceived` — добавляет новое сообщение (с дедупликацией).
 * - `messagesLoaded` — загружает массив сообщений (замена текущих).
 * - `messagesDelivered` — проставляет `deliveredAt` для указанных сообщений.
 * - `messagesRead` — проставляет `readAt` для всех сообщений в переписке.
 */
export const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    /** Добавляет одно новое сообщение в массив переписки (с дедупликацией). */
    messageReceived(state, action: PayloadAction<{ conversationId: string; message: MessageView }>) {
      const { conversationId, message } = action.payload;

      if (!state[conversationId]) {
        state[conversationId] = [];
      }

      const exists = state[conversationId].some((m) => m._id === message._id);

      if (!exists) {
        state[conversationId].push(message);
      }
    },

    /** Загружает массив сообщений для переписки (замена текущих). */
    messagesLoaded(state, action: PayloadAction<{ conversationId: string; messages: MessageView[] }>) {
      const { conversationId, messages } = action.payload;

      state[conversationId] = messages;
    },

    /** Проставляет `deliveredAt` для указанных ID сообщений. */
    messagesDelivered(state, action: PayloadAction<{ messageIds: string[]; deliveredAt: string }>) {
      const { messageIds, deliveredAt } = action.payload;
      const idSet = new Set(messageIds);

      for (const messages of Object.values(state)) {
        for (const msg of messages) {
          if (idSet.has(msg._id) && !msg.deliveredAt) {
            msg.deliveredAt = deliveredAt;
          }
        }
      }
    },

    /** Проставляет `readAt` для всех сообщений в указанной переписке. */
    messagesRead(state, action: PayloadAction<{ conversationId: string; readAt: string }>) {
      const { conversationId, readAt } = action.payload;
      const messages = state[conversationId];

      if (!messages) return;

      for (const msg of messages) {
        if (!msg.readAt) {
          msg.readAt = readAt;
        }
      }
    },
  },
});

export const { messageReceived, messagesLoaded, messagesDelivered, messagesRead } = messagesSlice.actions;
export const messagesReducer = messagesSlice.reducer;
