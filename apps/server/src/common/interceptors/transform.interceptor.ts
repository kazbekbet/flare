import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';

import { map, type Observable } from 'rxjs';

/**
 * Унифицированная оболочка успешного ответа API.
 * Все 2xx-ответы контроллеров автоматически заворачиваются в `{ data }`,
 * чтобы клиент мог единообразно разбирать success/error.
 *
 * @prop {T} data - Полезная нагрузка ответа.
 */
export interface SuccessResponse<T> {
  data: T;
}

/**
 * Глобальный интерцептор, заворачивающий любой возврат контроллера в `{ data }`.
 * Пропускает уже обёрнутые ответы (если поле `data` уже присутствует).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
          return payload as unknown as SuccessResponse<T>;
        }
        return { data: payload };
      }),
    );
  }
}
