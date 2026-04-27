import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';

import { randomUUID } from 'node:crypto';
import { Model } from 'mongoose';

import { type LoginDto, type RegisterDto, verifyChallenge } from '@flare/shared';

import { type JwtAccessPayload, type JwtRefreshPayload } from '../../common/types/authenticated.types.js';
import { type AppEnv } from '../../config/env.types.js';
import { Session, type SessionDocument } from '../mongoose/schemas/session.schema.js';
import { User, type UserDocument } from '../mongoose/schemas/user.schema.js';

/**
 * Пара токенов, выдаваемая клиенту после register/refresh.
 *
 * @prop {string} accessToken - Короткоживущий JWT для HTTP/WS запросов.
 * @prop {string} refreshToken - Долгоживущий JWT, хранится в httpOnly cookie.
 * @prop {number} accessTokenExpiresIn - Время жизни access-токена в секундах.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

/**
 * Результат регистрации или входа пользователя.
 *
 * @prop {string} userId - ID пользователя.
 * @prop {AuthTokens} tokens - Выданная пара токенов.
 */
export interface AuthResult {
  userId: string;
  tokens: AuthTokens;
}

/**
 * Сервис аутентификации.
 * Регистрация без пароля — идентификация через владение приватным ключом (E2E-keypair).
 * Refresh-токены ротируются через коллекцию `sessions` с TTL.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppEnv>,
  ) {}

  /**
   * Регистрирует нового пользователя и выдаёт пару токенов.
   *
   * @param dto - DTO регистрации (displayName + publicKey + опциональный signingPublicKey).
   * @returns ID нового пользователя и токены.
   * @throws ConflictException если displayName уже занят.
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const exists = await this.userModel.exists({ displayName: dto.displayName });

    if (exists) {
      throw new ConflictException({ message: 'displayName already taken', code: 'USERNAME_TAKEN' });
    }

    const user = await this.userModel.create({
      displayName: dto.displayName,
      publicKey: dto.publicKey,
      signingPublicKey: dto.signingPublicKey,
      fcmToken: dto.fcmToken,
    });

    const tokens = await this.issueTokens(user.id);

    return { userId: user.id, tokens };
  }

  /**
   * Вход по challenge-подписи. Проверяет Ed25519-подпись timestamp публичным ключом пользователя.
   *
   * @param dto - DTO входа (displayName + signature + timestamp).
   * @returns ID пользователя и токены.
   * @throws UnauthorizedException если пользователь не найден, нет signingPublicKey или подпись невалидна.
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userModel.findOne({ displayName: dto.displayName });

    if (!user) {
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (!user.signingPublicKey) {
      throw new UnauthorizedException({ message: 'Signing key not registered', code: 'NO_SIGNING_KEY' });
    }

    const valid = verifyChallenge(user.signingPublicKey, dto.signature, dto.timestamp);

    if (!valid) {
      throw new UnauthorizedException({ message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const tokens = await this.issueTokens(user.id);

    return { userId: user.id, tokens };
  }

  /**
   * Ротация refresh-токена. Старая сессия удаляется, создаётся новая с новым `jti`.
   *
   * @param refreshToken - Текущий refresh-токен (обычно из httpOnly cookie).
   * @returns Новая пара токенов.
   * @throws UnauthorizedException если токен невалиден или сессия отсутствует.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefresh(refreshToken);
    const deleted = await this.sessionModel.findOneAndDelete({ userId: payload.sub, jti: payload.jti });
    if (!deleted) throw new UnauthorizedException({ message: 'Session not found', code: 'SESSION_REVOKED' });
    return this.issueTokens(payload.sub);
  }

  /**
   * Выход из системы. Инвалидирует конкретную сессию, если передан refresh-токен.
   *
   * @param refreshToken - Refresh-токен текущей сессии (опционально).
   */
  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.verifyRefresh(refreshToken);
      await this.sessionModel.deleteOne({ userId: payload.sub, jti: payload.jti });
    } catch {
      // Молча игнорируем невалидные токены — клиент всё равно очищает cookie.
    }
  }

  /**
   * Выпускает пару access + refresh токенов и сохраняет session-запись в MongoDB.
   *
   * @param userId - ID пользователя.
   * @returns Пара токенов.
   */
  private async issueTokens(userId: string): Promise<AuthTokens> {
    const jti = randomUUID();
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true }) ?? '15m';
    const refreshTtl = this.config.get('JWT_REFRESH_TTL', { infer: true }) ?? '7d';
    const accessPayload: JwtAccessPayload = { sub: userId };
    const refreshPayload: JwtRefreshPayload = { sub: userId, jti };

    // Типы jsonwebtoken требуют StringValue | number для expiresIn — приводим из string.
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: accessTtl as unknown as number,
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: refreshTtl as unknown as number,
    });

    const decoded = this.jwtService.decode<JwtRefreshPayload>(refreshToken);
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 3600_000);
    await this.sessionModel.create({ userId, jti, expiresAt });

    const accessDecoded = this.jwtService.decode<JwtAccessPayload>(accessToken);
    const accessExpiresIn = accessDecoded?.exp ? accessDecoded.exp - Math.floor(Date.now() / 1000) : 15 * 60;

    return { accessToken, refreshToken, accessTokenExpiresIn: accessExpiresIn };
  }

  /**
   * Проверяет подпись и срок действия refresh-токена.
   *
   * @param token - Refresh-токен.
   * @returns Декодированный payload.
   * @throws UnauthorizedException при невалидном токене.
   */
  private async verifyRefresh(token: string): Promise<JwtRefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException({ message: 'Invalid refresh token', code: 'INVALID_REFRESH' });
    }
  }
}
