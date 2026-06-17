// Feature: trustvexa-escrow-platform, Property 1: Platform fee follows the sliding scale with boundary and minimum rules
// Feature: trustvexa-escrow-platform, Property 2: Payout math is correct across every fee payer and identical for both views
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  BPS_DENOMINATOR,
  DEAL_MAX_USD_CENTS,
  DEAL_MIN_USD_CENTS,
  PLATFORM_FEE_MIN_CENTS,
  buildLineItems,
  buyerView,
  computeFeeBreakdown,
  mulDivRoundHalfUp,
  platformFeeCents,
  selectPlatformFeeBps,
  sellerView,
  settlementFeeCents,
  type FeePayer,
} from '../fee-engine.js';

const dealCents = fc.bigInt({ min: DEAL_MIN_USD_CENTS, max: DEAL_MAX_USD_CENTS });
const feePayer = fc.constantFrom<FeePayer>('buyer', 'seller', 'split');

describe('Property 1: platform fee sliding scale (Requirements 15.1-15.4)', () => {
  it('uses the lower adjacent percentage at every published boundary', () => {
    expect(selectPlatformFeeBps(150_000n)).toBe(350n); // $1,500 -> 3.5%
    expect(selectPlatformFeeBps(300_000n)).toBe(300n); // $3,000 -> 3%
    expect(selectPlatformFeeBps(500_000n)).toBe(250n); // $5,000 -> 2.5%
    expect(selectPlatformFeeBps(750_000n)).toBe(200n); // $7,500 -> 2%
    expect(selectPlatformFeeBps(1_200_000n)).toBe(175n); // $12,000 -> 1.75%
    expect(selectPlatformFeeBps(2_000_000n)).toBe(135n); // $20,000 -> 1.35%
  });

  it('uses the published rate just inside each tier', () => {
    expect(selectPlatformFeeBps(40_000n)).toBe(500n); // $400 -> 5%
    expect(selectPlatformFeeBps(149_999n)).toBe(500n);
    expect(selectPlatformFeeBps(299_999n)).toBe(350n);
    expect(selectPlatformFeeBps(5_000_000n)).toBe(135n); // $50,000 -> 1.35%
  });

  it('equals the tier percentage of the deal, or the $30 floor', () => {
    fc.assert(
      fc.property(dealCents, (deal) => {
        const expectedPct = mulDivRoundHalfUp(deal, selectPlatformFeeBps(deal), BPS_DENOMINATOR);
        const expected =
          expectedPct < PLATFORM_FEE_MIN_CENTS ? PLATFORM_FEE_MIN_CENTS : expectedPct;
        expect(platformFeeCents(deal)).toBe(expected);
      }),
      { numRuns: 300 },
    );
  });

  it('is never below the flat $30 minimum', () => {
    fc.assert(
      fc.property(dealCents, (deal) => {
        expect(platformFeeCents(deal) >= PLATFORM_FEE_MIN_CENTS).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('applies the $30 floor for the smallest deals', () => {
    // $600 * 5% = $30 exactly; anything at/below that pins to the floor.
    expect(platformFeeCents(60_000n)).toBe(3_000n);
    expect(platformFeeCents(40_000n)).toBe(3_000n); // $400 * 5% = $20.00 -> $30
  });
});

describe('Property 2: payout math & view parity (Requirements 15.5, 16.1, 16.4-16.6, 16.8)', () => {
  const gasCents = fc.bigInt({ min: 0n, max: 100_000n });

  it('conserves funds: buyerSends === sellerReceives + platformKeeps + networkTakes', () => {
    fc.assert(
      fc.property(dealCents, feePayer, gasCents, (deal, payer, gas) => {
        const b = computeFeeBreakdown({ dealAmountCents: deal, feePayer: payer, gasFeeCents: gas });
        expect(b.buyerSendsCents).toBe(
          b.sellerReceivesCents + b.platformKeepsCents + b.networkTakesCents,
        );
      }),
      { numRuns: 300 },
    );
  });

  it('charges the platform fee per fee_payer and never splits it per side', () => {
    fc.assert(
      fc.property(dealCents, feePayer, gasCents, (deal, payer, gas) => {
        const b = computeFeeBreakdown({ dealAmountCents: deal, feePayer: payer, gasFeeCents: gas });
        // Shares always re-sum to the single total fee.
        expect(b.buyerPlatformShareCents + b.sellerPlatformShareCents).toBe(b.platformFeeCents);
        expect(b.platformKeepsCents).toBe(b.platformFeeCents + b.settlementFeeCents);
        expect(b.settlementFeeCents).toBe(settlementFeeCents(deal));
        if (payer === 'buyer') {
          expect(b.buyerSendsCents).toBe(deal + b.platformFeeCents);
          expect(b.sellerReceivesCents).toBe(deal - b.settlementFeeCents - gas);
        } else if (payer === 'seller') {
          expect(b.buyerSendsCents).toBe(deal);
          expect(b.sellerReceivesCents).toBe(
            deal - b.platformFeeCents - b.settlementFeeCents - gas,
          );
        }
      }),
      { numRuns: 300 },
    );
  });

  it('splits the fee 50/50 with no cent created or lost', () => {
    fc.assert(
      fc.property(dealCents, gasCents, (deal, gas) => {
        const b = computeFeeBreakdown({
          dealAmountCents: deal,
          feePayer: 'split',
          gasFeeCents: gas,
        });
        const diff = b.buyerPlatformShareCents - b.sellerPlatformShareCents;
        expect(diff === 0n || diff === 1n).toBe(true); // buyer takes the odd cent
        expect(b.buyerPlatformShareCents + b.sellerPlatformShareCents).toBe(b.platformFeeCents);
      }),
      { numRuns: 200 },
    );
  });

  it('renders identical buyer-view and seller-view line items', () => {
    fc.assert(
      fc.property(dealCents, feePayer, gasCents, (deal, payer, gas) => {
        const b = computeFeeBreakdown({ dealAmountCents: deal, feePayer: payer, gasFeeCents: gas });
        expect(buyerView(b)).toStrictEqual(sellerView(b));
        expect(buyerView(b)).toStrictEqual(buildLineItems(b));
      }),
      { numRuns: 200 },
    );
  });

  it('honours a configurable, non-50/50 split and still conserves every cent', () => {
    const splitBps = fc.bigInt({ min: 0n, max: 10_000n });
    fc.assert(
      fc.property(dealCents, gasCents, splitBps, (deal, gas, bps) => {
        const b = computeFeeBreakdown({
          dealAmountCents: deal,
          feePayer: 'split',
          gasFeeCents: gas,
          splitBuyerBps: bps,
        });
        // Shares always re-sum to the single total fee, for any ratio.
        expect(b.buyerPlatformShareCents + b.sellerPlatformShareCents).toBe(b.platformFeeCents);
        expect(b.splitBuyerBps).toBe(bps);
        // Fund conservation holds regardless of the ratio.
        expect(b.buyerSendsCents).toBe(
          b.sellerReceivesCents + b.platformKeepsCents + b.networkTakesCents,
        );
      }),
      { numRuns: 200 },
    );
  });

  it('assigns the whole fee to the buyer at 100% and to the seller at 0%', () => {
    const deal = 1_000_000n;
    const all = computeFeeBreakdown({
      dealAmountCents: deal,
      feePayer: 'split',
      gasFeeCents: 0n,
      splitBuyerBps: 10_000n,
    });
    expect(all.buyerPlatformShareCents).toBe(all.platformFeeCents);
    expect(all.sellerPlatformShareCents).toBe(0n);
    const none = computeFeeBreakdown({
      dealAmountCents: deal,
      feePayer: 'split',
      gasFeeCents: 0n,
      splitBuyerBps: 0n,
    });
    expect(none.buyerPlatformShareCents).toBe(0n);
    expect(none.sellerPlatformShareCents).toBe(none.platformFeeCents);
  });
});
