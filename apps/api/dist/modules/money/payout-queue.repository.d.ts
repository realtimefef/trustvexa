/**
 * Payout queue persistence (tasks 5.23, 5.24, DB-bound).
 *
 * Manages `payout_queue` rows, records `payout_preflight_checks`, and reads the
 * `withdrawal_allowlist` and `operator_payout_limits` that feed the preflight
 * context. Authorization logic lives in `payout-preflight.ts` /
 * `payout-queue.ts`; this module only persists and reads. `bigint` amounts are
 * bound/returned as strings to preserve precision.
 */
import type { PreflightCheckResult } from './payout-preflight.js';
import type { PayoutQueueStatus } from './payout-queue.js';
export interface PayoutQueueTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface EnqueuePayoutInput {
    dealId: string;
    payeeId: string;
    coin: string;
    network: string;
    address: string;
    amountCoin: string;
    amountSmallestUnit: bigint;
    holdUntil: string | null;
}
export interface PayoutQueueRow {
    id: string;
    deal_id: string;
    status: PayoutQueueStatus;
    version_no: number;
}
export declare function enqueuePayout(client: PayoutQueueTxClient, input: EnqueuePayoutInput): Promise<PayoutQueueRow>;
/**
 * Advance payout status with an optimistic version guard. Returns the new
 * version, or null if another writer moved first (caller should reload).
 */
export declare function updatePayoutStatus(client: PayoutQueueTxClient, payoutId: string, expectedVersion: number, nextStatus: PayoutQueueStatus, txHash: string | null): Promise<number | null>;
export declare function recordPreflightChecks(client: PayoutQueueTxClient, payoutQueueId: string, dealId: string, checkedBy: string, results: readonly PreflightCheckResult[]): Promise<void>;
export interface AllowlistStatus {
    activeFrom: string | null;
    isActive: boolean;
}
export declare function loadAllowlistStatus(client: PayoutQueueTxClient, coin: string, network: string, address: string): Promise<AllowlistStatus | null>;
export interface OperatorCap {
    dailyCapSmallestUnit: bigint;
    usedTodaySmallestUnit: bigint;
    remainingSmallestUnit: bigint;
}
export declare function loadOperatorCap(client: PayoutQueueTxClient, coin: string, network: string): Promise<OperatorCap | null>;
//# sourceMappingURL=payout-queue.repository.d.ts.map