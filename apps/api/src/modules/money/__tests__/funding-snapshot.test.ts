// Feature: trustvexa-escrow-platform, Property 6: Funding snapshots are immutable
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  assertSnapshotImmutable,
  buildFundingSnapshot,
  diffSnapshot,
  FundingSnapshotMutationError,
  FUNDING_SNAPSHOT_FIELDS,
  type FundingSnapshotInput,
} from '../funding-snapshot.js';

// Generate a consistent, fund-conserving snapshot input.
const snapshotInput = (): fc.Arbitrary<FundingSnapshotInput> =>
  fc
    .record({
      dealAmount: fc.bigInt({ min: 40_000n, max: 5_000_000n }),
      platformFee: fc.bigInt({ min: 0n, max: 200_000n }),
      settlement: fc.bigInt({ min: 0n, max: 50_000n }),
      gas: fc.bigInt({ min: 0n, max: 20_000n }),
      buyerExtra: fc.bigInt({ min: 0n, max: 200_000n }),
      unit: fc.bigInt({ min: 1n, max: 10n ** 18n }),
      feePayer: fc.constantFrom('buyer' as const, 'seller' as const, 'split' as const),
    })
    .map((r) => {
      const totalFees = r.platformFee + r.settlement + r.gas;
      // buyerTotal - sellerPayout must equal totalFees and stay within bounds.
      const buyerTotal = r.dealAmount + r.buyerExtra;
      const sellerPayout = buyerTotal - totalFees;
      return {
        coin: 'ETH',
        network: 'ETH',
        dealAmount: r.dealAmount,
        feePayer: r.feePayer,
        platformFee: r.platformFee,
        sellerSettlementFee: r.settlement,
        transactionFee: r.gas,
        buyerTotal,
        sellerPayout,
        amountCoin: '0.5',
        amountSmallestUnit: r.unit,
        lockedFxRate: '2500.123456',
        fxSource: 'primary',
      } satisfies FundingSnapshotInput;
    })
    // Keep only inputs that satisfy the builder's invariants.
    .filter(
      (s) => s.buyerTotal >= s.dealAmount && s.sellerPayout >= 0n && s.sellerPayout <= s.dealAmount,
    );

describe('Property 6: funding snapshots are immutable', () => {
  it('freezes the snapshot so direct mutation never takes effect', () => {
    fc.assert(
      fc.property(snapshotInput(), (input) => {
        const snap = buildFundingSnapshot(input);
        expect(Object.isFrozen(snap)).toBe(true);
        const before = snap.buyerTotal;
        try {
          (snap as unknown as { buyerTotal: bigint }).buyerTotal = before + 1n;
        } catch {
          /* strict-mode throw is also acceptable */
        }
        expect(snap.buyerTotal).toBe(before);
      }),
    );
  });

  it('rejects any re-persist whose values differ from the locked snapshot', () => {
    fc.assert(
      fc.property(snapshotInput(), fc.constantFrom(...FUNDING_SNAPSHOT_FIELDS), (input, field) => {
        const stored = buildFundingSnapshot(input);
        // An identical snapshot is accepted.
        expect(() => assertSnapshotImmutable(stored, buildFundingSnapshot(input))).not.toThrow();
        // A tampered copy is rejected and names the changed field.
        const tampered = { ...stored } as Record<string, unknown>;
        const current = tampered[field];
        tampered[field] = typeof current === 'bigint' ? current + 1n : `${String(current)}!`;
        const frozenTampered = Object.freeze(tampered) as unknown as typeof stored;
        expect(() => assertSnapshotImmutable(stored, frozenTampered)).toThrow(
          FundingSnapshotMutationError,
        );
        expect(diffSnapshot(stored, frozenTampered)).toContain(field);
      }),
    );
  });
});
