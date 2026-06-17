/**
 * Task 4.4 — Property 16: invite tokens are single-use and honor expiry and
 * revocation. Validates Requirements 8.3 (single-use), 8.4 (expiry/revocation
 * rejected), 8.5 (revoke prevents use) against the pure `evaluateInvite`
 * decision and the token generator's uniqueness/round-trip. (fast-check, >= 100
 * runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  evaluateInvite,
  generateInviteToken,
  hashInviteToken,
  type InviteState,
} from '../invite-token.js';

const NUM_RUNS = 300;
const KEY = Buffer.alloc(32, 9);
const NOW = new Date('2026-01-01T00:00:00.000Z');

/** Build an invite state relative to NOW from primitive choices. */
const stateArb: fc.Arbitrary<InviteState> = fc
  .record({
    singleUse: fc.boolean(),
    used: fc.boolean(),
    revoked: fc.boolean(),
    // Expiry offset in minutes from NOW; negative => already expired.
    expiryOffsetMin: fc.integer({ min: -100000, max: 100000 }),
    hasExpiry: fc.boolean(),
  })
  .map(({ singleUse, used, revoked, expiryOffsetMin, hasExpiry }) => ({
    singleUse,
    usedAt: used ? new Date(NOW.getTime() - 60000).toISOString() : null,
    revokedAt: revoked ? new Date(NOW.getTime() - 60000).toISOString() : null,
    expiresAt: hasExpiry ? new Date(NOW.getTime() + expiryOffsetMin * 60000).toISOString() : null,
  }));

describe('Property 16: invite tokens are single-use and honor expiry/revocation', () => {
  it('rejects revoked invites regardless of any other state', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        if (state.revokedAt !== null) {
          expect(evaluateInvite(state, NOW)).toBe('revoked');
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('treats a single-use invite that was used as no longer usable', () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const usable = { ...state, revokedAt: null, singleUse: true, usedAt: NOW.toISOString() };
        // Not expired in the future so expiry cannot mask the used result.
        const notExpired: InviteState = {
          ...usable,
          expiresAt: new Date(NOW.getTime() + 3600000).toISOString(),
        };
        expect(evaluateInvite(notExpired, NOW)).toBe('used');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects expired invites that are neither revoked nor used', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), (agoMin) => {
        const state: InviteState = {
          singleUse: true,
          usedAt: null,
          revokedAt: null,
          expiresAt: new Date(NOW.getTime() - agoMin * 60000).toISOString(),
        };
        expect(evaluateInvite(state, NOW)).toBe('expired');
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('accepts only fresh, unused, unrevoked, unexpired invites', () => {
    fc.assert(
      fc.property(
        fc.option(fc.integer({ min: 1, max: 100000 }), { nil: undefined }),
        (aheadMin) => {
          const state: InviteState = {
            singleUse: true,
            usedAt: null,
            revokedAt: null,
            expiresAt:
              aheadMin === undefined
                ? null
                : new Date(NOW.getTime() + aheadMin * 60000).toISOString(),
          };
          expect(evaluateInvite(state, NOW)).toBe('ok');
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('honors revoked > used > expired priority', () => {
    const both: InviteState = {
      singleUse: true,
      usedAt: NOW.toISOString(),
      revokedAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() - 60000).toISOString(),
    };
    expect(evaluateInvite(both, NOW)).toBe('revoked');
  });

  it('generates unique, hashable, deterministic-hash tokens', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const a = generateInviteToken();
        const b = generateInviteToken();
        expect(a).not.toBe(b);
        expect(/^[A-Za-z0-9_-]+$/.test(a)).toBe(true);
        // Same token + key hashes deterministically; different tokens differ.
        expect(hashInviteToken(a, KEY)).toBe(hashInviteToken(a, KEY));
        expect(hashInviteToken(a, KEY)).not.toBe(hashInviteToken(b, KEY));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
