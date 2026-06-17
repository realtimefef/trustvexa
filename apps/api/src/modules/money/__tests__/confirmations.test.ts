// Feature: trustvexa-escrow-platform, Property 10: A deposit is funded iff it meets its chain's confirmation threshold
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  applyReorg,
  baseThreshold,
  creditKey,
  effectiveThreshold,
  fundingDecision,
  meetsThreshold,
  type Chain,
  type RiskTier,
} from '../confirmations.js';

const chains: Chain[] = ['ETH', 'BNB', 'TRON', 'SOLANA'];
const tiers: RiskTier[] = ['normal', 'large', 'suspicious'];

describe('Property 10: confirmation-threshold funding', () => {
  it('funds exactly when confirmations reach the effective threshold', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...chains),
        fc.constantFrom(...tiers),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (chain, tier, confirmations, finalized) => {
          const threshold = effectiveThreshold(chain, tier);
          const funded = meetsThreshold({ chain, confirmations, finalized }, tier);
          const expected = confirmations >= threshold && (chain !== 'SOLANA' || finalized === true);
          expect(funded).toBe(expected);
          expect(fundingDecision({ chain, confirmations, finalized }, tier)).toBe(
            expected ? 'fund' : 'wait',
          );
        },
      ),
    );
  });

  it('uses the documented base thresholds and escalates with risk', () => {
    expect(baseThreshold('ETH')).toBe(12);
    expect(baseThreshold('BNB')).toBe(15);
    expect(baseThreshold('TRON')).toBe(20);
    expect(effectiveThreshold('ETH', 'large')).toBe(24);
    expect(effectiveThreshold('ETH', 'suspicious')).toBe(36);
  });

  it('unfunds a previously funded deposit when a reorg drops it below threshold', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...chains),
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 0, max: 80 }),
        (chain, confirmations, depth) => {
          const state = { chain, confirmations, finalized: true };
          const out = applyReorg(state, depth, 'normal', true);
          expect(out.confirmations).toBe(Math.max(0, confirmations - depth));
          const stillFunded = meetsThreshold(
            { chain, confirmations: out.confirmations, finalized: true },
            'normal',
          );
          expect(out.shouldUnfund).toBe(!stillFunded);
        },
      ),
    );
  });

  it('builds a stable per-output credit key', () => {
    expect(creditKey('0xABC', 1)).toBe('0xabc:1');
  });
});
