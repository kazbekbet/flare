import { Injectable } from '@nestjs/common';

import { Observable, Subject } from 'rxjs';

import type { AppEvent } from './app-events.js';

/**
 * Внутрипроцессная шина событий на основе RxJS Subject.
 * Зарегистрирована глобально — любой модуль может инжектировать её без импорта EventsModule.
 */
@Injectable()
export class EventBusService {
  private readonly subject = new Subject<AppEvent>();

  /** Поток всех событий приложения. */
  readonly events$: Observable<AppEvent> = this.subject.asObservable();

  /**
   * Публикует событие всем текущим подписчикам.
   *
   * @param event - Событие приложения.
   */
  emit(event: AppEvent): void {
    this.subject.next(event);
  }
}
