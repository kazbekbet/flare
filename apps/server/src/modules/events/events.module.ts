import { Global, Module } from '@nestjs/common';

import { EventBusService } from './event-bus.service.js';

/**
 * Global module that provides EventBusService to every other module.
 * No imports required — just inject EventBusService directly.
 */
@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventsModule {}
