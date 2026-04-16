import { Injectable } from '@nestjs/common';

import { Observable, Subject } from 'rxjs';

import type { AppEvent } from './app-events.js';

/**
 * In-process event bus backed by an RxJS Subject.
 * Registered globally so any module can inject it without importing EventsModule.
 */
@Injectable()
export class EventBusService {
  private readonly subject = new Subject<AppEvent>();

  /** Observable stream of all application events. */
  readonly events$: Observable<AppEvent> = this.subject.asObservable();

  /**
   * Publishes an event to all current subscribers.
   *
   * @param event - The application event to emit.
   */
  emit(event: AppEvent): void {
    this.subject.next(event);
  }
}
