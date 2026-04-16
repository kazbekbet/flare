import type { Connection } from 'mongoose';

/**
 * A versioned migration unit.
 * `version` must be unique across all migrations and determines execution order.
 */
export interface Migration {
  /** Monotonically increasing integer (e.g. 1, 2, 3). Must be unique. */
  version: number;
  /** Human-readable description, shown in migrate:status output. */
  name: string;
  /** Apply the migration. Receives the active Mongoose connection. */
  up(connection: Connection): Promise<void>;
  /** Roll back the migration. Receives the active Mongoose connection. */
  down(connection: Connection): Promise<void>;
}
