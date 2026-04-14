import { generateIdentityKeypair } from '@flare/shared';

import { authenticated } from '../../../entities/session/index.js';
import { setAccessToken } from '../../../shared/api/index.js';
import { storePrivateKey } from '../../../shared/storage/index.js';
import { registerRequest } from '../api/register.api.js';

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
 * Диспатчер для входа в сессию — абстракция над стором,
 * чтобы thunk не зависел от конкретной типизации Dispatch из store.
 */
export type SessionDispatcher = (action: ReturnType<typeof authenticated>) => void;

/**
 * Выполняет полный флоу регистрации:
 * 1. Генерирует identity-keypair локально.
 * 2. Регистрирует пользователя на сервере.
 * 3. Шифрует приватный ключ PIN-ом и сохраняет в IndexedDB.
 * 4. Обновляет RTK-state и устанавливает access-токен для HTTP-клиента.
 *
 * @param args - Параметры регистрации.
 * @param dispatch - Функция отправки action.
 * @returns ID зарегистрированного пользователя.
 */
export async function performRegister(args: RegisterArgs, dispatch: SessionDispatcher): Promise<string> {
  const keypair = generateIdentityKeypair();
  const response = await registerRequest({
    displayName: args.displayName,
    publicKey: keypair.publicKey,
  });
  await storePrivateKey(keypair.privateKey, args.pin);
  setAccessToken(response.accessToken);
  dispatch(
    authenticated({
      userId: response.userId,
      displayName: args.displayName,
      publicKey: keypair.publicKey,
      privateKey: keypair.privateKey,
      accessToken: response.accessToken,
    }),
  );
  return response.userId;
}
