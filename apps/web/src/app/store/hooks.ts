import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './store';

/** Типизированный `useDispatch`. */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Типизированный `useSelector`. */
export const useAppSelector = <T>(selector: (state: RootState) => T): T => useSelector(selector);
