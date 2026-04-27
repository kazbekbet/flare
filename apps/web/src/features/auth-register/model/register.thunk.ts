import type { AppDispatch } from '@app/store';
import { authenticated } from '@entities/session';
import { storePrivateKey } from '@shared/storage';

import { generateIdentityKeypair } from '@flare/shared';

import { authApi } from '../api/register.api';

/**
 * Параметры регистрации из UI.
 *
 * @prop {string} displayName - Введённое имя.
 * @prop {string} pin - PIN-код для шифрования приватного ключа.
 */
export interface RegisterArgs {
  displayName: string;
  pin: string;
}

/**
 * Оркестрация регистрации:
 * 1. Генерирует identity-keypair локально.
 * 2. Вызывает RTK Query-мутацию `register`.
 * 3. Шифрует приватный ключ PIN-ом и сохраняет в IndexedDB.
 * 4. Кладёт сессию в RTK-state.
 *
 * Вызывается из UI с `store.dispatch` — не требует хуков, тестируется как чистая функция.
 *
 * @param args - Параметры регистрации.
 * @param dispatch - Типизированный `AppDispatch`.
 * @returns ID зарегистрированного пользователя.
 */
export async function performRegister(args: RegisterArgs, dispatch: AppDispatch): Promise<string> {
  const keypair = generateIdentityKeypair();

  const result = await dispatch(
    authApi.endpoints.register.initiate({
      displayName: args.displayName,
      publicKey: keypair.publicKey,
    }),
  ).unwrap();

  await storePrivateKey(keypair.privateKey, args.pin);
  dispatch(
    authenticated({
      userId: result.userId,
      displayName: args.displayName,
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      accessToken: result.accessToken,
    }),
  );

  return result.userId;
}
