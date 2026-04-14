import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser, JwtAccessPayload } from '../../../common/types/authenticated.types.js';
import type { AppEnv } from '../../../config/env.types.js';

/**
 * Passport-стратегия проверки JWT access-токена.
 * Токен извлекается из `Authorization: Bearer`. Секрет — `JWT_ACCESS_SECRET`.
 * После успешной проверки объект `AuthenticatedUser` кладётся в `request.user`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService<AppEnv>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }) ?? '',
    });
  }

  /**
   * Маппинг payload-а токена в объект пользователя, прикрепляемый к запросу.
   *
   * @param payload - Декодированный JWT-payload.
   * @returns Объект `AuthenticatedUser` для `request.user`.
   */
  validate(payload: JwtAccessPayload): AuthenticatedUser {
    return { id: payload.sub };
  }
}
