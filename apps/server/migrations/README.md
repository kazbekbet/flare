# Migrations

Versioned MongoDB schema migrations for the Flare server.

## Structure

Each migration is a TypeScript file that default-exports a `Migration` object:

```ts
// migrations/002-my-migration.ts
import type { Connection } from 'mongoose';

interface Migration { version: number; name: string; up(c: Connection): Promise<void>; down(c: Connection): Promise<void>; }

const migration: Migration = {
  version: 2,
  name: 'my-migration',
  async up(connection) { /* apply changes */ },
  async down(connection) { /* revert changes */ },
};

export default migration;
```

## Rules

1. File names must sort lexicographically in the intended execution order (e.g. `002-...`, `003-...`).
2. `version` must be a unique integer across all migrations.
3. `down()` should genuinely revert `up()`. If reversal is unsafe or impossible, document why and leave it as a no-op.
4. Migrations run inside `up()` / `down()` are **not** wrapped in a transaction automatically — add session logic yourself if needed.

## CLI

```bash
pnpm --filter @flare/server build          # compile src/ and migrations/
pnpm --filter @flare/server migrate:status # list applied/pending
pnpm --filter @flare/server migrate:up     # apply all pending
pnpm --filter @flare/server migrate:down   # roll back last applied
```

## Auto-apply on startup

Set `RUN_MIGRATIONS_ON_BOOT=true` to run pending migrations automatically when the NestJS app starts. Default is off.
