import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';

import type { AppEnv } from './config/env.types.js';
import { envValidationSchema } from './config/env.validation.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ConversationsModule } from './modules/conversations/conversations.module.js';
import { FriendsModule } from './modules/friends/friends.module.js';
import { GatewayModule } from './modules/gateway/gateway.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';

/**
 * Корневой модуль приложения.
 *
 * Подтягивает:
 * - ConfigModule с Joi-валидацией ENV (глобально)
 * - LoggerModule (nestjs-pino): JSON-логи, pretty в dev
 * - ThrottlerModule + глобальный ThrottlerGuard: rate-limit по IP
 * - MongooseModule: подключение к MongoDB Replica Set
 * - ZodValidationPipe (глобальный): валидация DTO из @flare/shared
 * - Продуктовые модули: Auth, Users, Friends, Conversations, Gateway, Health
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true, allowUnknown: true },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }) ?? 'info',
          transport:
            (config.get('NODE_ENV', { infer: true }) ?? 'development') === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          genReqId: (req) => (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID(),
          customProps: (req) => ({ requestId: req.id }),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv>) => [
        {
          ttl: (config.get('THROTTLE_TTL', { infer: true }) ?? 60) * 1000,
          limit: config.get('THROTTLE_LIMIT', { infer: true }) ?? 60,
        },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv>) => ({
        uri: config.get('MONGO_URI', { infer: true }),
      }),
    }),
    AuthModule,
    UsersModule,
    FriendsModule,
    ConversationsModule,
    GatewayModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class AppModule {}
