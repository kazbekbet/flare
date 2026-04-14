import { type CanActivate, type ExecutionContext, Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

import type { Socket } from 'socket.io';

import type { AppEnv } from '../../config/env.types.js';
import type { JwtAccessPayload } from '../types/authenticated.types.js';

/**
 * WebSocket-аутентификация через JWT из `handshake.auth.token`.
 * При успехе — проставляет `socket.data.userId` для дальнейшего использования в gateway-хендлерах.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppEnv>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);
    if (!token) throw new WsException('Missing auth token');

    try {
      const payload = await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      client.data.userId = payload.sub;
      return true;
    } catch (error) {
      this.logger.warn(`WS auth failed: ${(error as Error).message}`);
      throw new WsException('Invalid token');
    }
  }

  private extractToken(socket: Socket): string | undefined {
    const raw = socket.handshake.auth?.token ?? socket.handshake.headers?.authorization;
    if (!raw) return undefined;
    return typeof raw === 'string' && raw.startsWith('Bearer ') ? raw.slice(7) : String(raw);
  }
}
