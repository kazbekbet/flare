import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * HTTP-гвард, защищающий маршруты через JWT access-токен.
 * Использует стратегию `jwt` (см. `JwtStrategy`): токен берётся из заголовка `Authorization: Bearer`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
