/**
 * Server-authoritative escrow transition planner — Task 4.9.
 *
 * Pure decision step: validate the (from, event) pair against the allow-list
 * and compute the optimistic-lock version bump. The deal service applies the
 * returned plan inside ONE DB transaction guarded by
 * `UPDATE deals ... WHERE id = :id AND version_no = :readVersion`, writing the
 * new status + an atomic `escrow_logs` row in the same transaction. An
 * undefined edge throws InvalidTransitionError and leaves the deal unchanged.
 * (Requirements 13.2, 13.3, 17.11, 17.12)
 */
import type { DealEvent, DealStatus } from './state-machine.js';
import { nextState } from './state-machine.js';

export class InvalidTransitionError extends Error {
  readonly from: DealStatus;
  readonly event: DealEvent;

  constructor(from: DealStatus, event: DealEvent) {
    super(`Invalid escrow transition: state '${from}' does not accept event '${event}'`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.event = event;
  }
}

export interface TransitionPlan {
  readonly from: DealStatus;
  readonly to: DealStatus;
  readonly event: DealEvent;
  readonly readVersion: number;
  readonly nextVersion: number;
}

export function planTransition(
  from: DealStatus,
  event: DealEvent,
  readVersion: number,
): TransitionPlan {
  const to = nextState(from, event);
  if (to === null) throw new InvalidTransitionError(from, event);
  return { from, to, event, readVersion, nextVersion: readVersion + 1 };
}
