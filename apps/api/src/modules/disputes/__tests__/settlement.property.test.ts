import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { computeSettlement, settlementBalances } from '../dispute-resolution.js';

// Feature: trustvexa-escrow-platform, Property: dispute settlements conserve escrow
// A resolved dispute must distribute EXACTLY the escrowed amount between buyer
// and seller with no creation or loss of funds, for every outcome and every
// valid partial share. This guards the money invariant behind §24.7.
describe('Property: settlement always conserves the escrow', () => {
  it('full refund / full release distribute the whole escrow', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 24n }), (escrow) => {
        for (const outcome of ['full_refund', 'full_release'] as const) {
          const split = computeSettlement({ escrowAmount: escrow, outcome });
          expect(settlementBalances(escrow, split)).toBe(true);
          expect(split.toBuyer + split.toSeller).toBe(escrow);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('partial split conserves the escrow for any valid buyer share', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 24n }),
        fc.bigInt({ min: 0n, max: 10n ** 24n }),
        (escrow, rawShare) => {
          const buyerShare = rawShare % (escrow + 1n); // clamp into [0, escrow]
          const split = computeSettlement({
            escrowAmount: escrow,
            outcome: 'partial_split',
            buyerShare,
          });
          expect(settlementBalances(escrow, split)).toBe(true);
          expect(split.toBuyer).toBe(buyerShare);
          expect(split.toSeller).toBe(escrow - buyerShare);
        },
      ),
      { numRuns: 200 },
    );
  });
});
