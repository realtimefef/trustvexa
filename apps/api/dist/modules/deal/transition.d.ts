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
export declare class InvalidTransitionError extends Error {
    readonly from: DealStatus;
    readonly event: DealEvent;
    constructor(from: DealStatus, event: DealEvent);
}
export interface TransitionPlan {
    readonly from: DealStatus;
    readonly to: DealStatus;
    readonly event: DealEvent;
    readonly readVersion: number;
    readonly nextVersion: number;
}
export declare function planTransition(from: DealStatus, event: DealEvent, readVersion: number): TransitionPlan;
//# sourceMappingURL=transition.d.ts.map