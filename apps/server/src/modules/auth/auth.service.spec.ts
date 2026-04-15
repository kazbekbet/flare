import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { Session } from '../mongoose/schemas/session.schema.js';
import { User } from '../mongoose/schemas/user.schema.js';
import { AuthService } from './auth.service.js';

/**
 * Создаёт моки Mongoose-моделей и JWT-сервиса для unit-тестов AuthService.
 * Никакой БД не поднимается — только проверка бизнес-логики на мокках.
 */
function buildHarness() {
  const userModel = {
    exists: jest.fn(),
    create: jest.fn(),
  };
  const sessionModel = {
    create: jest.fn().mockResolvedValue(undefined),
    findOneAndDelete: jest.fn(),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  };
  const jwtService = {
    signAsync: jest
      .fn()
      .mockImplementation(async (payload: Record<string, unknown>) => `token.${JSON.stringify(payload)}`),
    verifyAsync: jest
      .fn()
      .mockImplementation(async (token: string) => JSON.parse(token.replace(/^token\./, '')) as unknown),
    decode: jest.fn().mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 900 }),
  };
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
      };
      return map[key] ?? '';
    }),
  };
  return { userModel, sessionModel, jwtService, configService };
}

describe('AuthService', () => {
  let service: AuthService;
  let h: ReturnType<typeof buildHarness>;

  beforeEach(async () => {
    h = buildHarness();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: h.userModel },
        { provide: getModelToken(Session.name), useValue: h.sessionModel },
        { provide: JwtService, useValue: h.jwtService },
        { provide: ConfigService, useValue: h.configService },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('register: создаёт пользователя и возвращает пару токенов', async () => {
    h.userModel.exists.mockResolvedValue(null);
    h.userModel.create.mockResolvedValue({ id: 'new-user-id' });

    const result = await service.register({ displayName: 'Alice', publicKey: 'pk' });

    expect(result.userId).toBe('new-user-id');
    expect(result.tokens.accessToken).toContain('token.');
    expect(result.tokens.refreshToken).toContain('token.');
    expect(h.sessionModel.create).toHaveBeenCalledTimes(1);
  });

  it('register: бросает ConflictException при занятом displayName', async () => {
    h.userModel.exists.mockResolvedValue({ _id: 'existing' });
    await expect(service.register({ displayName: 'Alice', publicKey: 'pk' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('refresh: ротирует сессию — удаляет старую и выдаёт новую пару', async () => {
    h.sessionModel.findOneAndDelete.mockResolvedValue({ _id: 'session-id' });

    const tokens = await service.refresh('token.{"sub":"user-1","jti":"jti-1"}');

    expect(tokens.accessToken).toContain('token.');
    expect(tokens.refreshToken).toContain('token.');
    expect(h.sessionModel.findOneAndDelete).toHaveBeenCalledWith({ userId: 'user-1', jti: 'jti-1' });
  });

  it('refresh: бросает UnauthorizedException, если сессия уже удалена', async () => {
    h.sessionModel.findOneAndDelete.mockResolvedValue(null);
    await expect(service.refresh('token.{"sub":"user-1","jti":"jti-1"}')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout: удаляет сессию если токен валиден, молча игнорирует невалидный', async () => {
    await service.logout('token.{"sub":"user-1","jti":"jti-1"}');
    expect(h.sessionModel.deleteOne).toHaveBeenCalledWith({ userId: 'user-1', jti: 'jti-1' });

    h.jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));
    await expect(service.logout('garbage')).resolves.toBeUndefined();
  });

  it('logout: без токена — no-op', async () => {
    await expect(service.logout(undefined)).resolves.toBeUndefined();
    expect(h.sessionModel.deleteOne).not.toHaveBeenCalled();
  });
});
