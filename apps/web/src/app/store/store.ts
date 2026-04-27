import { sessionReducer } from '@entities/session';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi, socketListenerMiddleware } from '@shared/api';

/**
 * Корневой RTK-store приложения.
 * Объединяет `sessionSlice` и единый RTK Query `baseApi`
 * (эндпоинты которого инжектятся из entities/features).
 */
export const store = configureStore({
  reducer: {
    session: sessionReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().prepend(socketListenerMiddleware.middleware).concat(baseApi.middleware),
});

/** Корневой тип state для селекторов. */
export type RootState = ReturnType<typeof store.getState>;

/** Тип Dispatch, включая поддержку thunks и RTK Query. */
export type AppDispatch = typeof store.dispatch;
