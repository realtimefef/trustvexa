# @trustvexa/db — Database migrations

Versioned PostgreSQL migrations for TrustVexa. PostgreSQL is the source of truth
and **every schema change is a reviewed, version-controlled migration**
(design: Architecture & Stack; Requirements 43.1, 43.4).

## Migration tool: node-pg-migrate (chosen)

We use [`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) as the
migration runner. Why this over the alternatives:

- **Up/down support out of the box.** Every migration exports `up` and `down`,
  giving reversible, reviewable changes — exactly what the design requires
  ("every change is a reviewed migration").
- **Reads `DATABASE_URL` from the environment.** No credentials are hard-coded;
  the connection string is the Render-provided `DATABASE_URL`
  (Requirement 41.7), matching the shared pool in `@trustvexa/shared/db`.
- **Plain, explicit migrations.** Migrations are ordinary files applied in
  filename order and tracked in a `pgmigrations` table. This keeps full control
  over raw SQL and indexes — important for the §16 3NF schema, hash-chain
  columns, partial/unique indexes, and integer money columns in task group 2.
- **Simple and robust.** A small CLI with no ORM lock-in; the api and worker
  services share the same migrated schema without coupling to a query builder.

This is a dedicated migrations package (rather than living inside `apps/api`)
so both `@trustvexa/api` and `@trustvexa/worker` share one authoritative schema
history.

## Layout

```
packages/db/
  migrations/
    1700000000000_baseline.js   # empty baseline (no tables) — task group 2 builds on it
  package.json
```

## Commands

Run from the repo root (proxied) or from this package. `DATABASE_URL` must be
set in the environment (see the root `.env.example`).

| Action            | Root                       | This package                  |
| ----------------- | -------------------------- | ----------------------------- |
| Apply all (up)    | `pnpm migrate:up`          | `pnpm run migrate:up`         |
| Roll back one     | `pnpm migrate:down`        | `pnpm run migrate:down`       |
| Create new        | `pnpm migrate:create NAME` | `pnpm run migrate:create NAME`|
| Dry-run (up)      | `pnpm migrate:dry-run`     | `pnpm run migrate:dry-run`    |
| Raw CLI passthru  | `pnpm migrate ...`         | `pnpm run migrate ...`        |

The connection string is read from `DATABASE_URL`. Migrations are JavaScript
(`-j js`) and live in `migrations/`.

## CI

The CI pipeline (`.github/workflows/ci.yml`) runs `migrate:up` then
`migrate:down` against a **throwaway PostgreSQL service container** (no real
secrets) to verify migrations apply and reverse cleanly. Deploy is handled by
Render via `render.yaml` blueprints.
