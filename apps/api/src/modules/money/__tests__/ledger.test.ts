// Feature: trustvexa-escrow-platform, Property 5: The double-entry ledger always balances and conserves escrowed funds
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  LedgerImbalanceError,
  assertBalanced,
  assertEscrowConserved,
  buildSettlementGroups,
  depositFundedPostings,
  groupImbalances,
  isBalanced,
  netByCoin,
  platformFeePostings,
  type DealSettlementAmounts,
  type LedgerPosting,
} from '../ledger.js';

const amount = fc.bigInt({ min: 0n, max: 10n ** 18n });

// Build a conserved settlement by construction: pick the components, then set
// escrowed to their exact sum.
const settlement = fc
  .record({
    platformFee: amount,
    settlementFee: amount,
    gas: amount,
    sellerRelease: amount,
    buyerRefund: amount,
  })
  .map(
    (parts): DealSettlementAmounts => ({
      coin: 'USDT',
      network: 'tron',
      dealId: 'deal-1',
      platformFeeSmallestUnit: parts.platformFee,
      settlementFeeSmallestUnit: parts.settlementFee,
      gasSmallestUnit: parts.gas,
      sellerReleaseSmallestUnit: parts.sellerRelease,
      buyerRefundSmallestUnit: parts.buyerRefund,
      escrowedSmallestUnit:
        parts.platformFee +
        parts.settlementFee +
        parts.gas +
        parts.sellerRelease +
        parts.buyerRefund,
    }),
  );

describe('Property 5: ledger balance & fund conservation (Requirements 17.6, 17.7, 24.7)', () => {
  it('every settlement group balances and the whole ledger balances', () => {
    fc.assert(
      fc.property(settlement, (amounts) => {
        const groups = buildSettlementGroups(amounts);
        for (const group of groups) {
          expect(isBalanced(group.postings)).toBe(true);
        }
        // Whole ledger: every coin/network nets to zero across all groups.
        for (const net of netByCoin(groups).values()) {
          expect(net).toBe(0n);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('conserves escrowed funds across all disbursements', () => {
    fc.assert(
      fc.property(settlement, (amounts) => {
        expect(() => assertEscrowConserved(amounts)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  it('rejects a settlement whose parts do not sum to the escrowed amount', () => {
    fc.assert(
      fc.property(settlement, fc.bigInt({ min: 1n, max: 10n ** 9n }), (amounts, drift) => {
        const tampered: DealSettlementAmounts = {
          ...amounts,
          escrowedSmallestUnit: amounts.escrowedSmallestUnit + drift,
        };
        expect(() => buildSettlementGroups(tampered)).toThrow();
      }),
      { numRuns: 200 },
    );
  });

  it('flags and rejects an unbalanced entry group, leaving nothing posted', () => {
    const unbalanced: readonly LedgerPosting[] = [
      {
        accountType: 'hot_wallet_asset',
        direction: 'debit',
        amountSmallestUnit: 100n,
        coin: 'ETH',
        network: 'ethereum',
        reason: 'bad',
      },
      {
        accountType: 'escrow_liability',
        direction: 'credit',
        amountSmallestUnit: 99n,
        coin: 'ETH',
        network: 'ethereum',
        reason: 'bad',
      },
    ];
    expect(isBalanced(unbalanced)).toBe(false);
    expect(groupImbalances(unbalanced)).toHaveLength(1);
    expect(() => assertBalanced({ entryGroupId: 'g1', postings: unbalanced })).toThrow(
      LedgerImbalanceError,
    );
    expect(() => assertBalanced({ entryGroupId: 'g2', postings: [] })).toThrow(
      LedgerImbalanceError,
    );
  });

  it('builds balanced two-leg groups for each money event', () => {
    const ctx = { coin: 'BNB', network: 'bsc', dealId: 'deal-9' };
    expect(isBalanced(depositFundedPostings(ctx, 5_000n, 'g').postings)).toBe(true);
    expect(isBalanced(platformFeePostings(ctx, 30n, 'g').postings)).toBe(true);
  });
});
