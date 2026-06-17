# Contributing to TrustVexa

Thanks for helping improve TrustVexa. This is a financial application, so we hold a high
bar for correctness, security, and clarity. Please read this guide before opening a pull
request.

## Code of conduct

By participating you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ground rules

- **Never commit secrets.** No real keys, tokens, mnemonics, or connection strings.
  Use `.env` locally (git-ignored) and the Render dashboard in production.
- **Money is server-side and integer-only.** Never compute, store, or compare money
  with floating point. Use the integer smallest-unit primitives in
  `@trustvexa/shared` / the money module.
- **The ledger is append-only and balanced.** Never mutate balances directly; record
  balanced double-entry rows.
- **Trust the server, not the client.** Roles, amounts, and fees are always derived
  server-side.

## Prerequisites

- Node.js **>= 20**
- pnpm **9.15.9** (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- Local PostgreSQL and Redis

## Getting started

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm migrate:up
```

Run services in separate terminals:

```bash
pnpm --filter @trustvexa/api dev
pnpm --filter @trustvexa/web dev
pnpm --filter @trustvexa/worker dev
```

## Branching & commits

- Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`,
  `chore/<short-name>`.
- Use [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add split-fee preview to deal creation`
  - `fix: reject expired OAuth state tokens`
  - `docs: clarify migration workflow`
- Keep commits focused and message bodies explain **why**, not just what.

## Coding standards

- **TypeScript strict** everywhere: `verbatimModuleSyntax` (use `import type`),
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`.
- **ESM** with explicit `.js` import suffixes in source.
- Layered API: `routes → controllers → services → repositories`. Keep HTTP concerns out
  of services and DB concerns out of controllers.
- Validate all external input with **Zod** schemas (shared where possible).
- Prefer small, pure, dependency-free “core” modules (e.g. fee engine, state machine)
  that are easy to unit-test.
- Style is enforced by **Prettier** (single quotes, semicolons, trailing commas) and
  **ESLint**.

## Required checks before a PR

Run the full gate locally:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

All must pass. If you change money, fee, ledger, deal-state, or auth logic, add or
update **unit and property-based tests** (Vitest + fast-check). Property tests should
carry the `// Feature: trustvexa-escrow-platform, Property N: <title>` tag and run
>= 100 iterations.

## Database changes

- Add a migration with `pnpm migrate:create` — **every migration must have a working
  `down`**.
- Keep the schema in 3NF. Add appropriate constraints (FKs, unique/partial indexes,
  CHECKs). Money columns are integer smallest units.
- Verify `pnpm migrate:up` then `pnpm migrate:down` round-trips cleanly.

## Pull request checklist

- [ ] Linked to an issue or clearly describes the change and motivation
- [ ] `format:check`, `lint`, `typecheck`, and `test` all pass
- [ ] Tests added/updated for changed behavior
- [ ] No secrets, no floating-point money, no client-trusted money/roles
- [ ] Docs updated (README/ARCHITECTURE/.env.example) where relevant
- [ ] Migrations include a reversible `down`

Reviewers may request changes for correctness, security, or clarity. Be patient and
kind — see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting security issues

**Do not** open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
