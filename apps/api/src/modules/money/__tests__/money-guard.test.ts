// Feature: trustvexa-escrow-platform, Property 4: Money math is server-authoritative and ignores client-supplied amounts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  DEAL_MAX_USD_CENTS,
  DEAL_MIN_USD_CENTS,
  computeFeeBreakdown,
  type FeePayer,
} from '../fee-engine.js';
import { computeServerAuthoritativeBreakdown, reconcileClientDisplay } from '../money-guard.js';

const dealCents = fc.bigInt({ min: DEAL_MIN_USD_CENTS, max: DEAL_MAX_USD_CENTS });
const feePayer = fc.constantFrom<FeePayer>('buyer', 'seller', 'split');
const gasCents = fc.bigInt({ min: 0n, max: 100_000n });

// Arbitrary, possibly-malicious client payloads.
const clientJunk = fc.oneof(
  fc.constant(undefined),
  fc.record({
    dealAmountCents: fc.bigInt(),
    platformFeeCents: fc.bigInt(),
    buyerSendsCents: fc.bigInt(),
    sellerReceivesCents: fc.bigInt(),
  }),
  fc.anything(),
);

describe('Property 4: server-authoritative money (Requirements 17.3-17.5)', () => {
  it('is invariant to any client-supplied amount', () => {
    fc.assert(
      fc.property(dealCents, feePayer, gasCents, clientJunk, (deal, payer, gas, junk) => {
        const server = { dealAmountCents: deal, feePayer: payer, gasFeeCents: gas };
        const authoritative = computeServerAuthoritativeBreakdown(server, junk);
        expect(authoritative).toStrictEqual(computeServerAuthoritativeBreakdown(server));
        expect(authoritative).toStrictEqual(computeFeeBreakdown(server));
      }),
      { numRuns: 300 },
    );
  });

  it('reconciliation reports mismatches but never alters the authoritative figures', () => {
    const server = { dealAmountCents: 100_000n, feePayer: 'buyer' as FeePayer, gasFeeCents: 500n };
    const authoritative = computeServerAuthoritativeBreakdown(server);
    const tampered = reconcileClientDisplay(authoritative, {
      platformFeeCents: authoritative.platformFeeCents + 999n,
    });
    expect(tampered.matches).toBe(false);
    expect(tampered.mismatchedFields).toContain('platformFeeCents');
    // Authoritative figure is untouched by reconciliation.
    expect(authoritative).toStrictEqual(computeFeeBreakdown(server));

    const honest = reconcileClientDisplay(authoritative, {
      platformFeeCents: authoritative.platformFeeCents,
      buyerSendsCents: authoritative.buyerSendsCents,
    });
    expect(honest.matches).toBe(true);
    expect(honest.mismatchedFields).toHaveLength(0);
  });
});
