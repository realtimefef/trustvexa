// Feature: trustvexa-escrow-platform, Property 22: Trust restrictions match the missed-deadline count
// Validates: Requirements 26.2, 26.3, 26.4, 26.5 (fast-check, min 100 iterations)
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { restrictionFor, severityRank, canCreateDeal } from '../trust-restrictions.js';

describe('Property 22: trust restrictions match the missed-deadline count', () => {
  it('maps each miss count to the exact restriction kind', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (n) => {
        const r = restrictionFor({ missedDeadlineCount: n });
        if (n === 0) expect(r.kind).toBe('none');
        else if (n === 1) expect(r.kind).toBe('warning');
        else if (n === 2) expect(r.kind).toBe('soft_limit');
        else if (n === 3) expect(r.kind).toBe('temporary_block');
        else expect(r.kind).toBe('manual_review_block');
      }),
      { numRuns: 300 },
    );
  });

  it('escalates severity monotonically as misses increase', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (n) => {
        const lower = severityRank(restrictionFor({ missedDeadlineCount: n }).kind);
        const higher = severityRank(restrictionFor({ missedDeadlineCount: n + 1 }).kind);
        expect(higher).toBeGreaterThanOrEqual(lower);
      }),
      { numRuns: 200 },
    );
  });

  it('keeps block + reinstate flags consistent with the kind', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        const r = restrictionFor({ missedDeadlineCount: n });
        if (n <= 1) {
          expect(r.blockNewDeals).toBe(false);
          expect(canCreateDeal(r, 0)).toBe(true);
        }
        if (n === 2) {
          expect(r.maxActiveDeals).toBe(1);
          expect(canCreateDeal(r, 1)).toBe(false);
        }
        if (n >= 3) expect(r.blockNewDeals).toBe(true);
        if (n >= 4) expect(r.requiresMiddlemanReinstate).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('treats fraud as an immediate manual-review block regardless of count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (n) => {
        const r = restrictionFor({ missedDeadlineCount: n, fraud: true });
        expect(r.kind).toBe('manual_review_block');
        expect(r.blockNewDeals).toBe(true);
        expect(r.requiresMiddlemanReinstate).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
