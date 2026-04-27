import { Global, Module } from '@nestjs/common';

import { EventBusService } from './event-bus.service.js';

/**
 * Глобальный модуль, предоставляющий EventBusService всем остальным модулям.
 * Импортировать не нужно — достаточно инжектировать EventBusService напрямую.
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
