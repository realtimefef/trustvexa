// Dashboard + dispute integration tests (task 7.9, domain layer).
// Composes the pure Group-7 modules to assert the cross-module invariants the
// task calls out: action-center accuracy, milestone release sequencing, dispute
// settlement ledger balance, and review uniqueness. These run in vitest with no
// network. Browser-level Playwright E2E for the same flows is covered by the
// launch-gate critical-flow suite (task 9.5).
// (Requirements 24.7, 40.4, 25.1, 37.4)
import { describe, it, expect } from 'vitest';
import { nextActionsFor, isWaitingOn } from '../action-center.js';
import { evaluateMilestoneRelease, type ChecklistItem } from '../../handover/milestones.js';
import {
  computeSettlement,
  settlementBalances,
  resolutionEvent,
} from '../../disputes/dispute-resolution.js';
import { canSubmitReview } from '../../reviews/reviews.js';

describe('action center accuracy', () => {
  it('surfaces the blocking action for the party who must act', () => {
    expect(isWaitingOn('buyer', 'Verified')).toBe(true); // must fund
    expect(nextActionsFor('buyer', 'Verified')[0]?.code).toBe('fund_escrow');
    expect(isWaitingOn('seller', 'Funded')).toBe(true); // must hand over
    expect(isWaitingOn('middleman', 'Disputed')).toBe(true); // must resolve
    expect(isWaitingOn('buyer', 'Released')).toBe(false); // terminal
  });
});

describe('milestone release sequencing', () => {
  it('releases milestones in order without ever exceeding escrow', () => {
    const escrow = 1_000_000n;
    const checklist: ChecklistItem[] = [{ code: 'proof', required: true, done: true }];
    const first = evaluateMilestoneRelease({
      milestone: { id: 'm1', amount: 600_000n, released: false },
      checklist,
      isMiddleman: true,
      escrowAmount: escrow,
      alreadyReleased: 0n,
    });
    expect(first.ok).toBe(true);
    expect(first.isFinal).toBe(false);
    const second = evaluateMilestoneRelease({
      milestone: { id: 'm2', amount: 400_000n, released: false },
      checklist,
      isMiddleman: true,
      escrowAmount: escrow,
      alreadyReleased: first.nextReleasedTotal,
    });
    expect(second.ok).toBe(true);
    expect(second.isFinal).toBe(true);
    expect(second.nextReleasedTotal).toBe(escrow);
    // A third release would overshoot and must be rejected.
    const overflow = evaluateMilestoneRelease({
      milestone: { id: 'm3', amount: 1n, released: false },
      checklist,
      isMiddleman: true,
      escrowAmount: escrow,
      alreadyReleased: second.nextReleasedTotal,
    });
    expect(overflow.ok).toBe(false);
  });
});

describe('dispute settlement ledger balance', () => {
  it('every outcome distributes the full escrow with no leakage', () => {
    const escrow = 987_654n;
    for (const outcome of ['full_refund', 'full_release'] as const) {
      const split = computeSettlement({ escrowAmount: escrow, outcome });
      expect(settlementBalances(escrow, split)).toBe(true);
    }
    const partial = computeSettlement({
      escrowAmount: escrow,
      outcome: 'partial_split',
      buyerShare: 123_456n,
    });
    expect(settlementBalances(escrow, partial)).toBe(true);
    expect(resolutionEvent('partial_split')).toBe('ResolvePartialSplit');
  });
});

describe('review uniqueness eligibility', () => {
  it('allows exactly one review per party per completed deal', () => {
    expect(canSubmitReview({ dealStatus: 'Released', isParty: true, alreadyReviewed: false })).toBe(
      true,
    );
    expect(canSubmitReview({ dealStatus: 'Released', isParty: true, alreadyReviewed: true })).toBe(
      false,
    );
  });
});
