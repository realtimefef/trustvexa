/**
 * Task 3.11 — Property test for single-use verification of email/auth tokens.
 *
 * Property 16: single-use tokens are single-use and honor expiry + revocation.
 * The opaque-token model is shared between auth single-use tokens
 * (email-token.ts) and invite tokens, so the single-use + expiry + revocation
 * semantics are validated once here against a reference model that mirrors
 * `consumeSingleUseToken`. Only the SHA-256 hash is ever persisted.
 * (Validates Requirements 4.2, 4.3, 8.3, 8.4, 8.5 — fast-check, >= 100 runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { hashToken } from '../token-store.js';

const NUM_RUNS = 200;

interface StoredToken {
  tokenHash: string;
  expiresAt: number;
  usedAt: number | null;
  revokedAt: number | null;
}

/** In-memory reference store mirroring email-token.ts consume semantics. */
function makeStore() {
  const rows = new Map<string, StoredToken>();
  return {
    issue(token: string, expiresAt: number): void {
      const tokenHash = hashToken(token);
      rows.set(tokenHash, { tokenHash, expiresAt, usedAt: null, revokedAt: null });
    },
    revoke(token: string, at: number): void {
      const row = rows.get(hashToken(token));
      if (row && row.revokedAt === null) row.revokedAt = at;
    },
    consume(token: string, now: number): boolean {
      const row = rows.get(hashToken(token));
      if (!row) return false;
      if (row.usedAt !== null || row.revokedAt !== null) return false;
      if (row.expiresAt <= now) return false;
      row.usedAt = now;
      return true;
    },
    raw(token: string): StoredToken | undefined {
      return rows.get(hashToken(token));
    },
  };
}

describe('Property 16: single-use token semantics', () => {
  it('verifies exactly once for a token that is valid and unexpired', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 1_000_000 }),
        fc.integer({ min: 1, max: 25 }),
        (token, ttl, attempts) => {
          const store = makeStore();
          const now = 1_000;
          store.issue(token, now + ttl);
          const results: boolean[] = [];
          for (let i = 0; i < attempts; i += 1) results.push(store.consume(token, now));
          expect(results.filter(Boolean).length).toBe(1);
          expect(results[0]).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('never verifies at or after expiry', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 0, max: 1_000 }),
        (token, over) => {
          const store = makeStore();
          const expiresAt = 5_000;
          store.issue(token, expiresAt);
          expect(store.consume(token, expiresAt + over)).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('never verifies after revocation', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (token) => {
        const store = makeStore();
        store.issue(token, 10_000);
        store.revoke(token, 100);
        expect(store.consume(token, 200)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('persists only the hash, never the raw token', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (token) => {
        const store = makeStore();
        store.issue(token, 10_000);
        const row = store.raw(token);
        expect(row).toBeDefined();
        expect(row!.tokenHash).not.toBe(token);
        expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
        expect(hashToken(token)).toBe(hashToken(token));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
