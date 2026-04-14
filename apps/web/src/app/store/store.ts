import { configureStore } from '@reduxjs/toolkit';

import { sessionReducer } from '../../entities/session/index.js';

/**
 * Корневой RTK-store приложения.
 * В Phase 1 — только slice сессии. Слайсы сообщений/друзей добавляются в Phase 2.
 */
export const store = configureStore({
  reducer: {
    session: sessionReducer,
  },
});

/** Корневой тип state для селекторов. */
export type RootState = ReturnType<typeof store.getState>;

/** Тип Dispatch, включая поддержку thunks. */
export type AppDispatch = typeof store.dispatch;
