import { type PreflightCheckName, type PreflightCheckResult } from '../money/payout-preflight.js';
export interface PreflightView {
    authorized: boolean;
    failedCheck: PreflightCheckName | null;
    results: PreflightCheckResult[];
}
export interface ApprovePayoutResult {
    payoutId: string;
    status: string;
    approved: boolean;
    preflight: PreflightView;
}
export interface BroadcastPayoutResult {
    payoutId: string;
    status: string;
    broadcast: boolean;
    preflight: PreflightView;
}
export interface ApprovePayoutInput {
    middlemanId: string;
    payoutId: string;
    idempotencyKey: string;
}
/**
 * Approve (first control signature) a queued payout. Idempotent: re-approving
 * an already-approved payout returns the current state without erroring.
 */
export declare function approvePayout(input: ApprovePayoutInput): Promise<ApprovePayoutResult>;
export interface BroadcastPayoutInput {
    middlemanId: string;
    payoutId: string;
    idempotencyKey: string;
}
/**
 * Broadcast (second control signature) an approved payout. Re-runs the full
 * preflight; only transitions `approved -> broadcast` when every check passes,
 * otherwise returns the failed check and leaves the payout untouched.
 * Idempotent: a payout already broadcast replays its current state.
 */
export declare function broadcastPayout(input: BroadcastPayoutInput): Promise<BroadcastPayoutResult>;
//# sourceMappingURL=payout.service.d.ts.map