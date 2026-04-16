import type { Connection } from 'mongoose';

// Migration interface is duplicated here to avoid a cross-rootDir import.
// Keep in sync with src/modules/migrations/migration.types.ts.
interface Migration {
  version: number;
  name: string;
  up(connection: Connection): Promise<void>;
  down(connection: Connection): Promise<void>;
}

/**
 * Ensures the indexes introduced in commit b146ccc are present.
 * These indexes are already created by Mongoose schema definitions on app start,
 * so this migration is a safe no-op on a fresh or already-migrated database.
 * It serves as a reference example for authoring future migrations.
 */
const migration: Migration = {
  version: 1,
  name: 'ensure-friendship-conversation-indexes',

  async up(connection: Connection): Promise<void> {
    const db = connection.db;
    if (!db) throw new Error('No database connection');

    await db.collection('conversations').createIndex({ memberIds: 1 }, { background: true });
    await db.collection('friendships').createIndex({ addresseeId: 1, status: 1 }, { background: true });
    await db.collection('friendships').createIndex({ requesterId: 1, status: 1 }, { background: true });
  },

  async down(connection: Connection): Promise<void> {
    // Indexes created by Mongoose schema definitions are intentional and load-bearing.
    // Rolling back this migration does NOT drop them — doing so would degrade query performance.
    void connection;
  },
};

export default migration;
