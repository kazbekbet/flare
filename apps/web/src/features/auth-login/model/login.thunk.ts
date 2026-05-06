import type { AppDispatch } from '@app/store';
import { authenticated } from '@entities/session';
import { loadPrivateKey } from '@shared/storage';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

import { signChallenge } from '@flare/shared';

import { loginApi } from '../api/login.api';

/**
 * Параметры входа из UI.
 *
 * @prop {string} displayName - Введённое имя пользователя.
 * @prop {string} pin - PIN-код для расшифровки приватного ключа из IndexedDB.
 */
export interface LoginArgs {
  displayName: string;
  pin: string;
}

/**
 * Вычисляет X25519 публичный ключ из приватного.
 *
 * @param privateKeyB64 - Base64-encoded X25519 приватный ключ (32 байта).
 * @returns Base64-encoded X25519 публичный ключ.
 */
function deriveX25519PublicKey(privateKeyB64: string): string {
  const secretKey = naclUtil.decodeBase64(privateKeyB64);
  const kp = nacl.box.keyPair.fromSecretKey(secretKey);

  return naclUtil.encodeBase64(kp.publicKey);
}

/**
 * Оркестрация входа по challenge-подписи:
 * 1. Загружает приватный ключ из IndexedDB (расшифровка PIN-ом).
 * 2. Подписывает текущий timestamp.
 * 3. Вызывает RTK Query-мутацию `login`.
 * 4. Кладёт сессию в RTK-state.
 *
 * @param args - Параметры входа.
 * @param dispatch - Типизированный `AppDispatch`.
 * @returns ID пользователя.
 * @throws {Error} Если ключ не найден или PIN неверный.
 */
export async function performLogin(args: LoginArgs, dispatch: AppDispatch): Promise<string> {
  const privateKey = await loadPrivateKey(args.pin);

  if (!privateKey) {
    throw new Error('Приватный ключ не найден. Зарегистрируйтесь заново.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signChallenge(privateKey, timestamp);

  const result = await dispatch(
    loginApi.endpoints.login.initiate({
      displayName: args.displayName,
      signature,
      timestamp,
    }),
  ).unwrap();

  const publicKey = deriveX25519PublicKey(privateKey);

  dispatch(
    authenticated({
      userId: result.userId,
      displayName: args.displayName,
      publicKey,
      privateKey,
      accessToken: result.accessToken,
    }),
  );

  return result.userId;
}
