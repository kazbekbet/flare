# Flare

> Self-hosted E2E мессенджер для близких. Разворачивается на своём сервере за 5 минут.

NestJS · React PWA · MongoDB · Socket.io · tweetnacl. Privacy-first, offline-capable.

---

## Быстрый старт

**Требования:** Node.js ≥ 20, pnpm ≥ 9, Docker.

```bash
# 1. Клонировать и установить
git clone <repo-url> flare && cd flare
cp .env.example .env
pnpm bootstrap   # pnpm install + build shared/ui

# 2. Запустить всё разом (MongoDB + MinIO + server + web)
pnpm dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- MinIO console: <http://localhost:9001> (minioadmin / minioadmin)

Остановить Docker-сервисы: `pnpm stop`.

---

## Структура

```
apps/
  server/     # NestJS API + WebSocket Gateway
  web/        # React 19 PWA (Vite, FSD)
packages/
  shared/     # Типы, DTO, Zod-схемы, crypto — общие для фронта и бэка
  ui/         # Mantine + тема Flare
  config/     # eslint, prettier, tsconfig
docs/         # architecture.md, tasks.md, codestyle.md
```

**Frontend — Feature-Sliced Design:** `app → pages → widgets → features → entities → shared`.
**Backend — модульный NestJS** + `common/` (guards, filters, interceptors, types).

---

## Скрипты

| Команда | Что делает |
| --- | --- |
| `pnpm bootstrap` | `install` + сборка общих пакетов |
| `pnpm dev` | Docker up + все 4 процесса (shared/ui в watch, server/web в dev) |
| `pnpm dev:server` | Только сервер (Docker должен быть уже поднят) |
| `pnpm dev:web` | Только фронт |
| `pnpm services:up` / `pnpm stop` | Поднять / остановить Docker-сервисы |
| `pnpm build` | `turbo run build` по всему монорепо |
| `pnpm test` | `turbo run test` (vitest + jest) |
| `pnpm lint` | `turbo run lint` |
| `pnpm format` | Prettier по всему репо |

---

## Документация

- [`docs/architecture.md`](docs/architecture.md) — архитектурные решения, схемы БД, E2E-крипто, масштабирование
- [`docs/tasks.md`](docs/tasks.md) — декомпозиция по фазам (0–4 + Desktop UI)
- [`docs/codestyle.md`](docs/codestyle.md) — договорённости, которые не ловит линтер

---

## Стек

**Backend** — NestJS 11, Mongoose, Socket.io, passport-jwt, nestjs-zod, Pino, Joi, Helmet.
**Frontend** — React 19, Vite, TanStack Router, Redux Toolkit + RTK Query, Mantine, tweetnacl, React Hook Form + Zod.
**Infra** — MongoDB 7 Replica Set, MinIO (S3), Agenda.js, FCM (Phase 3).

---

## Лицензия

MIT.
