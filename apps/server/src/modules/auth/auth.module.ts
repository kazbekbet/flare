import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { Session, SessionSchema } from '../mongoose/schemas/session.schema.js';
import { User, UserSchema } from '../mongoose/schemas/user.schema.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

/**
 * Модуль аутентификации. Экспортирует `JwtModule` и `AuthService`,
 * чтобы WebSocket-гвард и другие модули могли проверять токены.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    PassportModule,
    // Секреты задаются явно на уровне вызова sign/verify в AuthService и WsJwtGuard —
    // здесь JwtModule используется как DI-провайдер для инжекции.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
