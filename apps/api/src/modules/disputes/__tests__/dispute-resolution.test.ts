import { describe, expect, it } from 'vitest';

import {
  canResolveDispute,
  computeSettlement,
  isEvidenceLocked,
  resolutionEvent,
  SettlementValidationError,
  settlementBalances,
} from '../dispute-resolution.js';

describe('computeSettlement', () => {
  it('full_refund sends the whole escrow to the buyer', () => {
    const split = computeSettlement({ escrowAmount: 1000n, outcome: 'full_refund' });
    expect(split).toEqual({ toBuyer: 1000n, toSeller: 0n });
  });

  it('full_release sends the whole escrow to the seller', () => {
    const split = computeSettlement({ escrowAmount: 1000n, outcome: 'full_release' });
    expect(split).toEqual({ toBuyer: 0n, toSeller: 1000n });
  });

  it('partial_split divides exactly between buyer and seller', () => {
    const split = computeSettlement({
      escrowAmount: 1000n,
      outcome: 'partial_split',
      buyerShare: 350n,
    });
    expect(split).toEqual({ toBuyer: 350n, toSeller: 650n });
    expect(split.toBuyer + split.toSeller).toBe(1000n);
  });

  it('allows the boundary partial shares (0 and full)', () => {
    expect(
      computeSettlement({ escrowAmount: 1000n, outcome: 'partial_split', buyerShare: 0n }),
    ).toEqual({ toBuyer: 0n, toSeller: 1000n });
    expect(
      computeSettlement({ escrowAmount: 1000n, outcome: 'partial_split', buyerShare: 1000n }),
    ).toEqual({ toBuyer: 1000n, toSeller: 0n });
  });

  it('rejects a non-positive escrow', () => {
    expect(() => computeSettlement({ escrowAmount: 0n, outcome: 'full_refund' })).toThrow(
      SettlementValidationError,
    );
    expect(() => computeSettlement({ escrowAmount: -5n, outcome: 'full_release' })).toThrow(
      /escrow_not_positive/,
    );
  });

  it('requires a buyer share for partial_split', () => {
    expect(() => computeSettlement({ escrowAmount: 1000n, outcome: 'partial_split' })).toThrow(
      /buyer_share_required/,
    );
  });

  it('rejects an out-of-range buyer share', () => {
    expect(() =>
      computeSettlement({ escrowAmount: 1000n, outcome: 'partial_split', buyerShare: 1001n }),
    ).toThrow(/buyer_share_out_of_range/);
    expect(() =>
      computeSettlement({ escrowAmount: 1000n, outcome: 'partial_split', buyerShare: -1n }),
    ).toThrow(/buyer_share_out_of_range/);
  });
});

describe('settlementBalances', () => {
  it('is true only when the split exactly distributes the escrow non-negatively', () => {
    expect(settlementBalances(1000n, { toBuyer: 400n, toSeller: 600n })).toBe(true);
    expect(settlementBalances(1000n, { toBuyer: 400n, toSeller: 500n })).toBe(false);
    expect(settlementBalances(1000n, { toBuyer: -1n, toSeller: 1001n })).toBe(false);
  });
});

describe('resolutionEvent', () => {
  it('maps each outcome to its state-machine event', () => {
    expect(resolutionEvent('full_refund')).toBe('ResolveFullRefund');
    expect(resolutionEvent('full_release')).toBe('ResolveFullRelease');
    expect(resolutionEvent('partial_split')).toBe('ResolvePartialSplit');
  });
});

describe('canResolveDispute', () => {
  it('only a middleman may resolve, and only from an active status', () => {
    expect(canResolveDispute('open', true)).toBe(true);
    expect(canResolveDispute('under_review', true)).toBe(true);
    expect(canResolveDispute('resolved', true)).toBe(false);
    expect(canResolveDispute('cancelled', true)).toBe(false);
    expect(canResolveDispute('open', false)).toBe(false);
  });
});

describe('isEvidenceLocked', () => {
  it('treats evidence with a lockedAt timestamp as immutable', () => {
    expect(isEvidenceLocked({ id: 'e1', fileHash: 'h', lockedAt: '2026-01-01' })).toBe(true);
    expect(isEvidenceLocked({ id: 'e1', fileHash: 'h', lockedAt: null })).toBe(false);
  });
});
