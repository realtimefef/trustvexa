/**
 * Task 4.6 — Property 15: single-use verification codes verify once and only
 * when valid. Validates Requirements 10.2 (hash-only storage), 10.3 (correct +
 * unexpired verifies), 10.4 (single-use), and 10.5 (expired/used/incorrect
 * rejected) against the pure code helpers and a reference model that mirrors
 * `submitVerificationCode`. (fast-check, >= 100 runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  codesMatch,
  evaluateCode,
  generateVerificationCode,
  hashVerificationCode,
  VERIFICATION_CODE_LENGTH,
  type CodeState,
} from '../verification-code.js';

const NUM_RUNS = 300;
const MAX_ATTEMPTS = 5;

interface StoredCode {
  codeHash: string;
  expiresAt: number;
  verifiedAt: number | null;
  attempts: number;
}

/** Reference model mirroring submitVerificationCode's decision sequence. */
function makeModel(code: string, expiresAt: number) {
  const row: StoredCode = {
    codeHash: hashVerificationCode(code),
    expiresAt,
    verifiedAt: null,
    attempts: 0,
  };
  return {
    row,
    submit(candidate: string, now: number): boolean {
      const state: CodeState = {
        verifiedAt: row.verifiedAt === null ? null : new Date(row.verifiedAt).toISOString(),
        expiresAt: new Date(row.expiresAt).toISOString(),
        attempts: row.attempts,
        maxAttempts: MAX_ATTEMPTS,
      };
      if (evaluateCode(state, new Date(now)) !== 'ok') {
        return false;
      }
      row.attempts += 1; // log every attempt (10.6)
      if (!codesMatch(candidate, row.codeHash)) {
        return false;
      }
      row.verifiedAt = now; // single-use (10.4)
      return true;
    },
  };
}

describe('Property 15: single-use verification codes', () => {
  it('verifies exactly once for the correct, unexpired code', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: MAX_ATTEMPTS }), (tries) => {
        const code = generateVerificationCode();
        const model = makeModel(code, 10_000);
        const results: boolean[] = [];
        for (let i = 0; i < tries; i += 1) {
          results.push(model.submit(code, 1_000));
        }
        expect(results.filter(Boolean).length).toBe(1);
        expect(results[0]).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('never verifies an incorrect code and still consumes an attempt', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const code = generateVerificationCode();
        let wrong = generateVerificationCode();
        if (wrong === code) {
          wrong = generateVerificationCode();
        }
        const model = makeModel(code, 10_000);
        expect(model.submit(wrong, 1_000)).toBe(false);
        expect(model.row.attempts).toBe(1);
        expect(model.row.verifiedAt).toBeNull();
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('never verifies at or after expiry', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000 }), (over) => {
        const code = generateVerificationCode();
        const expiresAt = 5_000;
        const model = makeModel(code, expiresAt);
        expect(model.submit(code, expiresAt + over)).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects once the attempt budget is exhausted', () => {
    const code = generateVerificationCode();
    const model = makeModel(code, 10_000);
    const wrong = code.split('').reverse().join('');
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      model.submit(wrong === code ? `${code}` : wrong, 1_000);
    }
    // Budget spent: even the correct code is now refused.
    expect(model.submit(code, 1_000)).toBe(false);
    expect(model.row.verifiedAt).toBeNull();
  });

  it('stores only a 64-hex SHA-256 hash, never the plaintext code', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const code = generateVerificationCode();
        expect(code).toMatch(/^\d{48}$/);
        expect(code.length).toBe(VERIFICATION_CODE_LENGTH);
        const hash = hashVerificationCode(code);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
        expect(hash).not.toBe(code);
        expect(hashVerificationCode(code)).toBe(hash);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
