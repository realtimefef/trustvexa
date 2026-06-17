/**
 * Task 4.10 — Property 9: only defined state transitions are accepted, and
 * every accepted transition is audited atomically (exactly one escrow_logs
 * entry). The reference `applyEvent` mirrors the deal service: an undefined
 * (state, event) pair leaves the deal unchanged with no log; a defined pair
 * advances to the allow-listed state and appends exactly one hash-chained
 * audit entry. (fast-check, >= 100 runs.)
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  appendEntry,
  GENESIS_PREV_HASH,
  isChainValid,
  type EscrowLogEntry,
} from '../audit-chain.js';
import {
  canTransition,
  DEAL_EVENTS,
  DEAL_STATUSES,
  nextState,
  type DealEvent,
  type DealStatus,
} from '../state-machine.js';
import { InvalidTransitionError, planTransition } from '../transition.js';

const NUM_RUNS = 300;
const statusArb = fc.constantFrom(...DEAL_STATUSES);
const eventArb = fc.constantFrom(...DEAL_EVENTS);

interface ApplyResult {
  state: DealStatus;
  logs: EscrowLogEntry[];
  accepted: boolean;
}

function applyEvent(state: DealStatus, event: DealEvent, chain: EscrowLogEntry[]): ApplyResult {
  if (!canTransition(state, event)) {
    return { state, logs: chain, accepted: false };
  }
  const plan = planTransition(state, event, 0);
  const prevHash = chain.length > 0 ? chain[chain.length - 1]!.entryHash : GENESIS_PREV_HASH;
  const entry = appendEntry(
    {
      dealId: 'deal-1',
      fromState: plan.from,
      toState: plan.to,
      actorId: 'actor-1',
      requestId: 'req-1',
      createdAt: new Date(0).toISOString(),
    },
    prevHash,
  );
  return { state: plan.to, logs: [...chain, entry], accepted: true };
}

describe('Property 9: escrow transition validity + atomic audit', () => {
  it('rejects undefined (state, event) pairs and leaves the deal unchanged', () => {
    fc.assert(
      fc.property(statusArb, eventArb, (state, event) => {
        fc.pre(!canTransition(state, event));
        const result = applyEvent(state, event, []);
        expect(result.accepted).toBe(false);
        expect(result.state).toBe(state);
        expect(result.logs).toHaveLength(0);
        expect(() => planTransition(state, event, 0)).toThrow(InvalidTransitionError);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('accepts only allow-listed edges, lands on the mapped state, and writes one audit row', () => {
    fc.assert(
      fc.property(statusArb, eventArb, (state, event) => {
        fc.pre(canTransition(state, event));
        const result = applyEvent(state, event, []);
        expect(result.accepted).toBe(true);
        expect(result.state).toBe(nextState(state, event));
        expect(result.logs).toHaveLength(1);
        expect(result.logs[0]!.fromState).toBe(state);
        expect(result.logs[0]!.toState).toBe(result.state);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('appends exactly one chained audit entry per accepted transition over a walk', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 30 }), (events) => {
        let state: DealStatus = 'Created';
        let chain: EscrowLogEntry[] = [];
        let accepted = 0;
        for (const event of events) {
          const before = chain.length;
          const result = applyEvent(state, event, chain);
          state = result.state;
          chain = result.logs;
          if (result.accepted) {
            accepted += 1;
            expect(chain.length).toBe(before + 1);
          } else {
            expect(chain.length).toBe(before);
          }
        }
        expect(chain).toHaveLength(accepted);
        expect(isChainValid(chain)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
