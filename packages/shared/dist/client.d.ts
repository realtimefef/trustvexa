/**
 * Browser-safe entry point for `@trustvexa/shared`.
 *
 * Re-exports ONLY the isomorphic pieces (constants, types, Zod schemas) that are
 * safe to bundle into the frontend. The Node-only modules (`db`, `redis`) are
 * intentionally excluded here so the web client never pulls in `pg`/`ioredis`.
 * Frontend code MUST import from `@trustvexa/shared/client`; the Node services
 * keep using the default `@trustvexa/shared` barrel.
 */
export * from './constants.js';
export * from './types.js';
export * from './schemas.js';
//# sourceMappingURL=client.d.ts.map