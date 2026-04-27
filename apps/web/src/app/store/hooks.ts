import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './store';

/**
 * Типизированный `useDispatch`.
 * Возвращает `AppDispatch` вместо базового `Dispatch` — поддерживает thunk-экшены.
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Типизированный `useSelector`.
 * Автоматически выводит тип из `RootState`, избавляя от ручной аннотации в компонентах.
 *
 * @param selector - Функция-селектор.
 * @returns Результат селектора.
 */
export const useAppSelector = <T>(selector: (state: RootState) => T): T => useSelector(selector);
