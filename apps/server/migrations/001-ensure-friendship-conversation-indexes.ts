import type { Connection } from 'mongoose';

// Интерфейс продублирован здесь, чтобы не тянуть cross-rootDir импорт.
// Держать в синхронизации с src/modules/migrations/migration.types.ts.
interface Migration {
  version: number;
  name: string;
  up(connection: Connection): Promise<void>;
  down(connection: Connection): Promise<void>;
}

/**
 * Гарантирует наличие индексов, введённых в коммите b146ccc.
 * Индексы уже создаются Mongoose-схемами при старте приложения,
 * поэтому на чистой или уже мигрированной базе миграция является безопасным no-op.
 * Служит эталонным примером для написания будущих миграций.
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
    // Индексы, созданные Mongoose-схемами, намеренны и нагрузочно значимы.
    // Откат этой миграции НЕ удаляет их — это деградировало бы производительность запросов.
    void connection;
  },
};

export default migration;
