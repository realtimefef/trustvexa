import { type ConfirmationState, type RiskTier } from './confirmations.js';
import { type PayoutApprovalState } from './payout-queue.js';
import type { PreflightResult } from './payout-preflight.js';
/** Confirmed -> Funded: only when the deposit reaches its confirmation threshold. */
export declare function canTransitionToFunded(deposit: ConfirmationState, tier?: RiskTier): boolean;
/** PayoutQueued -> Released: preflight authorized AND two distinct signatures. */
export declare function canRelease(preflight: PreflightResult, approval: PayoutApprovalState): boolean;
/**
 * Deterministic idempotency keys for timer-triggered money writes. The same
 * deal + cause always yields the same key, so a retried timer never produces a
 * second refund/release through runMoneyWrite.
 */
export declare function autoRefundKey(dealId: string, cause: string): string;
export declare function autoReleaseKey(dealId: string): string;
//# sourceMappingURL=state-money-guards.d.ts.map