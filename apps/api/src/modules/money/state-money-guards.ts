// Money guards that gate state-machine transitions and timer-driven auto money
// moves (task 5.26). Confirmed -> Funded requires confirmed on-chain funds at
// threshold; PayoutQueued -> Released requires a passing preflight plus two-step
// signing. Timer auto-refund/auto-release derive deterministic idempotency keys
// so they route safely through the money-write contract.
// (Requirements 13.11, 14.2, 14.8, 22.1, 22.4)

import { meetsThreshold, type ConfirmationState, type RiskTier } from './confirmations.js';
import { isFullyAuthorized, type PayoutApprovalState } from './payout-queue.js';
import type { PreflightResult } from './payout-preflight.js';

/** Confirmed -> Funded: only when the deposit reaches its confirmation threshold. */
export function canTransitionToFunded(
  deposit: ConfirmationState,
  tier: RiskTier = 'normal',
): boolean {
  return meetsThreshold(deposit, tier);
}

/** PayoutQueued -> Released: preflight authorized AND two distinct signatures. */
export function canRelease(preflight: PreflightResult, approval: PayoutApprovalState): boolean {
  return preflight.authorized && isFullyAuthorized(approval);
}

/**
 * Deterministic idempotency keys for timer-triggered money writes. The same
 * deal + cause always yields the same key, so a retried timer never produces a
 * second refund/release through runMoneyWrite.
 */
export function autoRefundKey(dealId: string, cause: string): string {
  return `auto-refund:${dealId}:${cause}`;
}

export function autoReleaseKey(dealId: string): string {
  return `auto-release:${dealId}`;
}
