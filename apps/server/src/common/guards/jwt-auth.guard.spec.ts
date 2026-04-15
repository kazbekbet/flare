import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard.js';

/**
 * Мок ExecutionContext для HTTP-запроса.
 *
 * @param headers - Заголовки запроса.
 * @returns ExecutionContext, достаточный для `AuthGuard('jwt')`.
 */
function buildHttpContext(headers: Record<string, string>): ExecutionContext {
  const request = { headers, user: undefined };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => jest.fn(),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('отклоняет запрос без Authorization-заголовка', async () => {
    const module = await Test.createTestingModule({ providers: [JwtAuthGuard, Reflector] }).compile();
    const guard = module.get(JwtAuthGuard);

    // canActivate отдаёт Observable/Promise — нас интересует отказ: без passport-стратегии
    // возвращается ошибка 401 (Unauthorized).
    await expect(Promise.resolve(guard.canActivate(buildHttpContext({})))).rejects.toBeDefined();
  });
});
