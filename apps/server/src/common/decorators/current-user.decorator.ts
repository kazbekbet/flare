import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest, AuthenticatedUser } from '../types/authenticated.types.js';

/**
 * Параметр-декоратор контроллера, извлекающий аутентифицированного пользователя из запроса.
 * Доступен только после `JwtAuthGuard`.
 *
 * @example
 * ```ts
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * me(@CurrentUser() user: AuthenticatedUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
