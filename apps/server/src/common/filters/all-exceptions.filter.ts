import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';

/**
 * Стандартизованное тело ошибки, возвращаемое клиенту.
 *
 * @prop {number} statusCode - HTTP-статус ответа.
 * @prop {string} message - Короткое описание ошибки.
 * @prop {string} [code] - Машиночитаемый код ошибки (опционально).
 * @prop {unknown} [details] - Детали валидации или стека (только в dev).
 * @prop {string} path - Путь запроса, вызвавшего ошибку.
 * @prop {string} timestamp - ISO-время возникновения.
 */
export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  code?: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

/**
 * Глобальный exception-фильтр.
 * Ловит HttpException, ZodValidationException и любые непредвиденные ошибки,
 * приводит их к единому JSON-формату и логирует.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code: string | undefined;
    let details: unknown;

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      code = 'VALIDATION_ERROR';
      details = (exception.getZodError() as ZodError).issues;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as { message?: string | string[]; code?: string; error?: string };
        message = Array.isArray(r.message) ? r.message.join('; ') : (r.message ?? r.error ?? message);
        code = r.code;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(exception);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      code,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
