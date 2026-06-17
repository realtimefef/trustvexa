/**
 * Task 4.11 — Property 11: deal amounts are accepted only within bounds.
 * A deal amount (integer cents) is valid iff $400 <= amount <= $50,000.
 * (fast-check, >= 100 runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  assertDealAmountWithinBounds,
  DealAmountOutOfBoundsError,
  isDealAmountWithinBounds,
  MAX_DEAL_AMOUNT_CENTS,
  MIN_DEAL_AMOUNT_CENTS,
} from '../deal-amount.js';

const NUM_RUNS = 300;

describe('Property 11: deal-amount bounds', () => {
  it('accepts every integer amount within [min, max]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MIN_DEAL_AMOUNT_CENTS, max: MAX_DEAL_AMOUNT_CENTS }),
        (amount) => {
          expect(isDealAmountWithinBounds(amount)).toBe(true);
          expect(() => assertDealAmountWithinBounds(amount)).not.toThrow();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects amounts below the minimum', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MIN_DEAL_AMOUNT_CENTS - 1 }), (amount) => {
        expect(isDealAmountWithinBounds(amount)).toBe(false);
        expect(() => assertDealAmountWithinBounds(amount)).toThrow(DealAmountOutOfBoundsError);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects amounts above the maximum', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_DEAL_AMOUNT_CENTS + 1, max: Number.MAX_SAFE_INTEGER }),
        (amount) => {
          expect(isDealAmountWithinBounds(amount)).toBe(false);
          expect(() => assertDealAmountWithinBounds(amount)).toThrow(DealAmountOutOfBoundsError);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects non-integer (floating-point) amounts inside the range', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: MIN_DEAL_AMOUNT_CENTS,
          max: MAX_DEAL_AMOUNT_CENTS,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (amount) => {
          fc.pre(!Number.isInteger(amount));
          expect(isDealAmountWithinBounds(amount)).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
