# Changelog

All notable changes to TrustVexa are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Feature-complete build of the escrow platform. All 118 spec tasks are implemented and
verified. Pending: production credentials and a live environment for full end-to-end,
integration, and E2E test execution.

### Added

- **Foundation** — pnpm monorepo (`web`, `api`, `worker`, `shared`, `db`), strict
  TypeScript config, ESLint/Prettier, Render blueprint, and CI workflows.
- **Database** — 3NF PostgreSQL schema, migrations with reversible `down`s, seed data,
  and constraint/migration integration tests.
- **Auth & JWT** — registration, login, Argon2 hashing, breached-password and
  reserved-name checks, **Google OAuth login**, JWT access/refresh with rotation and a
  `jti` denylist (REST + WS), brute-force lockout, sessions, account recovery, and
  step-up verification.
- **Deal lifecycle** — creation with amount bounds, drafts, duplication, invites,
  a 20-state deal state machine, inspection/funding windows, and worker-driven SLA
  timers.
- **Money** — integer smallest-unit primitives, tiered fee engine (5% → 1.35%, $30
  minimum, 0.5% settlement, gas pass-through), double-entry ledger, payments, payouts,
  refunds, and custody accounting.
- **Realtime** — Socket.IO chat with JWT auth and a Redis adapter, presence, per-deal
  rooms, and web-push notifications.
- **Dashboards** — buyer/seller/middleman and operator views.
- **Public & legal** — marketing pages, versioned Terms/Privacy acceptance,
  prohibited-use and screening policies.
- **Launch & ops** — feature flags, emergency pause switches, practice (testnet) mode,
  onboarding checklist, go-live gate, health roll-ups, alerting, and a dead-letter
  queue with exponential backoff.
- **PWA & accessibility** — installable Next.js front end, offline support, and WCAG
  2.1 AA accessibility checks.
- **Security tooling** — CI pipeline with secret scanning (gitleaks), SCA (Snyk), SAST
  (Semgrep + CodeQL), and DAST (OWASP ZAP), plus incident-response and hardening docs.
- **Documentation** — README, architecture, contributing, security policy, code of
  conduct, and this changelog.

[Unreleased]: https://example.com/trustvexa/compare/main...HEAD
