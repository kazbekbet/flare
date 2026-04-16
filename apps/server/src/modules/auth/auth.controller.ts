import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { type Request, type Response } from 'express';

import { AuthService, type AuthTokens } from './auth.service.js';
import { RegisterDto } from './dto/auth.dto.js';

/** Имя httpOnly-cookie, в которой клиенту возвращается refresh-токен. */
const REFRESH_COOKIE = 'flare_refresh';

/**
 * Аутентификация пользователей: регистрация без пароля, ротация refresh-токена, logout.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Регистрирует нового пользователя по displayName + publicKey.
   * Возвращает userId и access-токен; refresh-токен ставится в httpOnly cookie.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
  @ApiOperation({ summary: 'Регистрация по keypair' })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string; accessToken: string; accessTokenExpiresIn: number }> {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.tokens);
    return {
      userId: result.userId,
      accessToken: result.tokens.accessToken,
      accessTokenExpiresIn: result.tokens.accessTokenExpiresIn,
    };
  }

  /**
   * Ротация refresh-токена. Старая сессия отзывается, клиент получает новую пару.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ротация refresh-токена' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; accessTokenExpiresIn: number }> {
    const refreshToken = this.extractRefresh(req);
    if (!refreshToken) throw new UnauthorizedException({ message: 'Missing refresh token', code: 'NO_REFRESH' });
    const tokens = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, tokens);
    return { accessToken: tokens.accessToken, accessTokenExpiresIn: tokens.accessTokenExpiresIn };
  }

  /**
   * Выход: инвалидирует сессию и чистит cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Выход и инвалидация сессии' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = this.extractRefresh(req);
    await this.authService.logout(refreshToken);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  /**
   * Извлекает refresh-токен из httpOnly-cookie.
   *
   * @param req - HTTP-запрос.
   * @returns Токен или undefined.
   */
  private extractRefresh(req: Request): string | undefined {
    const cookies = (req as unknown as { cookies?: Record<string, string> }).cookies;
    return cookies?.[REFRESH_COOKIE];
  }

  /**
   * Устанавливает httpOnly-cookie с refresh-токеном.
   *
   * @param res - HTTP-ответ.
   * @param tokens - Пара токенов (нас интересует refresh).
   */
  private setRefreshCookie(res: Response, tokens: AuthTokens): void {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });
  }
}
