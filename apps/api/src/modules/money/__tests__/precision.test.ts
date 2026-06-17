// Feature: trustvexa-escrow-platform, Property 3: Money amounts use exact integer smallest-unit arithmetic
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PRECISION_RULES,
  fromSmallestUnit,
  getPrecisionRule,
  meetsMinTransfer,
  toSmallestUnit,
} from '../precision.js';

const DECIMALS = DEFAULT_PRECISION_RULES.map((rule) => rule.decimals);

describe('integer smallest-unit primitives (Requirements 17.1, 17.2)', () => {
  it('round-trips smallest-unit -> string -> smallest-unit exactly', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 30n }),
        fc.constantFrom(...DECIMALS),
        (units, decimals) => {
          const asString = fromSmallestUnit(units, decimals);
          expect(toSmallestUnit(asString, decimals)).toBe(units);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('round-trips signed amounts too', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -(10n ** 24n), max: 10n ** 24n }),
        fc.constantFrom(...DECIMALS),
        (units, decimals) => {
          expect(toSmallestUnit(fromSmallestUnit(units, decimals), decimals)).toBe(units);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('produces canonical strings with no trailing zeros', () => {
    expect(fromSmallestUnit(1_500_000n, 6)).toBe('1.5');
    expect(fromSmallestUnit(1_000_000n, 6)).toBe('1');
    expect(fromSmallestUnit(0n, 18)).toBe('0');
    expect(fromSmallestUnit(1n, 18)).toBe('0.000000000000000001');
    expect(fromSmallestUnit(-2_500_000_000n, 9)).toBe('-2.5');
  });

  it('parses decimal strings into smallest units', () => {
    expect(toSmallestUnit('1.5', 6)).toBe(1_500_000n);
    expect(toSmallestUnit('0', 18)).toBe(0n);
    expect(toSmallestUnit('1', 9)).toBe(1_000_000_000n);
  });

  it('rejects floating-point and over-precise amounts (no money loss)', () => {
    expect(() => toSmallestUnit('1.2345567', 6)).toThrow();
    expect(() => toSmallestUnit('1e6', 6)).toThrow();
    expect(() => toSmallestUnit('NaN', 6)).toThrow();
    expect(() => toSmallestUnit('1.5.5', 6)).toThrow();
  });

  it('every stored amount is an exact integer (bigint) count of units', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 20n }),
        fc.constantFrom(...DECIMALS),
        (units, decimals) => {
          const result = toSmallestUnit(fromSmallestUnit(units, decimals), decimals);
          expect(typeof result).toBe('bigint');
          expect(result).toBe(units);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('resolves seeded precision rules and enforces min-transfer floor', () => {
    const eth = getPrecisionRule('ETH', 'ethereum');
    expect(eth.decimals).toBe(18);
    const usdtTron = getPrecisionRule('USDT', 'tron');
    expect(usdtTron.decimals).toBe(6);
    expect(meetsMinTransfer(1_000_000n, usdtTron)).toBe(true);
    expect(meetsMinTransfer(999_999n, usdtTron)).toBe(false);
    expect(() => getPrecisionRule('DOGE', 'dogechain')).toThrow();
  });
});
