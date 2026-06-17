import { describe, expect, it } from 'vitest';

import {
  canBuyerReveal,
  evaluateMilestoneRelease,
  isChecklistComplete,
  pendingRequired,
  type ChecklistItem,
} from '../milestones.js';

const done = (code: string, required = true): ChecklistItem => ({ code, required, done: true });
const todo = (code: string, required = true): ChecklistItem => ({ code, required, done: false });

describe('isChecklistComplete / pendingRequired', () => {
  it('is complete when every required item is done', () => {
    expect(isChecklistComplete([done('a'), done('b')])).toBe(true);
    expect(isChecklistComplete([done('a'), todo('b', false)])).toBe(true); // optional pending is ok
    expect(isChecklistComplete([done('a'), todo('b')])).toBe(false);
    expect(pendingRequired([done('a'), todo('b'), todo('c', false)])).toEqual([todo('b')]);
  });
});

describe('evaluateMilestoneRelease', () => {
  const base = {
    milestone: { id: 'm1', amount: 400n, released: false },
    checklist: [done('handover')],
    isMiddleman: true,
    escrowAmount: 1000n,
    alreadyReleased: 0n,
  };

  it('allows a release that meets every rule and reports the running total', () => {
    const d = evaluateMilestoneRelease(base);
    expect(d.ok).toBe(true);
    expect(d.nextReleasedTotal).toBe(400n);
    expect(d.isFinal).toBe(false);
  });

  it('flags the final milestone when the escrow is exhausted', () => {
    const d = evaluateMilestoneRelease({ ...base, alreadyReleased: 600n });
    expect(d.ok).toBe(true);
    expect(d.nextReleasedTotal).toBe(1000n);
    expect(d.isFinal).toBe(true);
  });

  it('rejects a non-middleman caller', () => {
    expect(evaluateMilestoneRelease({ ...base, isMiddleman: false }).error).toBe('not_middleman');
  });

  it('rejects an already-released milestone', () => {
    expect(
      evaluateMilestoneRelease({ ...base, milestone: { id: 'm1', amount: 400n, released: true } })
        .error,
    ).toBe('already_released');
  });

  it('rejects when the required checklist is incomplete', () => {
    expect(evaluateMilestoneRelease({ ...base, checklist: [todo('handover')] }).error).toBe(
      'checklist_incomplete',
    );
  });

  it('rejects a release that would exceed the escrow', () => {
    expect(
      evaluateMilestoneRelease({
        ...base,
        milestone: { id: 'm1', amount: 700n, released: false },
        alreadyReleased: 400n,
      }).error,
    ).toBe('exceeds_escrow');
  });
});

describe('canBuyerReveal', () => {
  it('is true only once the middleman has revealed to the buyer', () => {
    expect(canBuyerReveal('revealed_to_buyer')).toBe(true);
    expect(canBuyerReveal('middleman_only')).toBe(false);
    expect(canBuyerReveal('revoked')).toBe(false);
  });
});
