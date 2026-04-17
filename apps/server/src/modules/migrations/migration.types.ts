import type { Connection } from 'mongoose';

/**
 * Версионированная единица миграции.
 * `version` должен быть уникальным среди всех миграций и определяет порядок выполнения.
 */
export interface Migration {
  /** Монотонно возрастающее целое число (например, 1, 2, 3). Должно быть уникальным. */
  version: number;
  /** Человекочитаемое описание, отображаемое в выводе migrate:status. */
  name: string;
  /** Применяет миграцию. Получает активное Mongoose-соединение. */
  up(connection: Connection): Promise<void>;
  /** Откатывает миграцию. Получает активное Mongoose-соединение. */
  down(connection: Connection): Promise<void>;
}
