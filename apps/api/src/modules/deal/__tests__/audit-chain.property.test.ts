/**
 * Task 4.12 — Property 20: audit logs are tamper-evident via hash chaining.
 * Building a chain with appendEntry yields a valid chain; mutating any entry's
 * payload without recomputing its hash breaks the chain detectably at or before
 * the tampered index. (fast-check, >= 100 runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  appendEntry,
  GENESIS_PREV_HASH,
  isChainValid,
  verifyChain,
  type EscrowLogEntry,
  type EscrowLogInput,
} from '../audit-chain.js';

const NUM_RUNS = 300;

const logInputArb: fc.Arbitrary<EscrowLogInput> = fc.record({
  dealId: fc.string({ minLength: 1 }),
  fromState: fc.string({ minLength: 1 }),
  toState: fc.string({ minLength: 1 }),
  actorId: fc.string({ minLength: 1 }),
  requestId: fc.string({ minLength: 1 }),
  createdAt: fc.date({ noInvalidDate: true }).map((d) => d.toISOString()),
});

function buildChain(inputs: ReadonlyArray<EscrowLogInput>): EscrowLogEntry[] {
  const chain: EscrowLogEntry[] = [];
  let prevHash = GENESIS_PREV_HASH;
  for (const input of inputs) {
    const entry = appendEntry(input, prevHash);
    chain.push(entry);
    prevHash = entry.entryHash;
  }
  return chain;
}

describe('Property 20: tamper-evident hash-chained audit logs', () => {
  it('builds a valid, correctly-linked chain', () => {
    fc.assert(
      fc.property(fc.array(logInputArb, { minLength: 1, maxLength: 25 }), (inputs) => {
        const chain = buildChain(inputs);
        expect(isChainValid(chain)).toBe(true);
        expect(chain[0]!.prevHash).toBe(GENESIS_PREV_HASH);
        for (let i = 1; i < chain.length; i += 1) {
          expect(chain[i]!.prevHash).toBe(chain[i - 1]!.entryHash);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('detects tampering with any entry payload', () => {
    fc.assert(
      fc.property(
        fc.array(logInputArb, { minLength: 1, maxLength: 25 }),
        fc.nat(),
        (inputs, rawIndex) => {
          const chain = buildChain(inputs);
          const idx = rawIndex % chain.length;
          const tampered = chain.slice();
          const victim = tampered[idx]!;
          // Mutate the payload but keep the stored entryHash unchanged.
          tampered[idx] = { ...victim, toState: `${victim.toState}-tampered` };
          const brokenAt = verifyChain(tampered);
          expect(brokenAt).not.toBe(-1);
          expect(brokenAt).toBeLessThanOrEqual(idx);
          expect(isChainValid(tampered)).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
