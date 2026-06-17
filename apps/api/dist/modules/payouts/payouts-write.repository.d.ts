/**
 * Write-side data access for payout approval/broadcast and refund processing.
 *
 * Every helper takes the shared money-write transaction client so the payout
 * status transition, the recorded preflight checks, the refund status event,
 * and the ledger postings all commit atomically (or roll back together). This
 * module only persists/reads REAL columns from the `payout_queue`, `deals`,
 * `payout_preflight_checks`, `refund_status_events`, `token_contract_allowlist`,
 * and `ledger_entries` migrations; authorization/preflight logic lives in the
 * service and in `money/payout-preflight.ts`. `bigint` amounts are bound and
 * returned as strings to preserve precision.
 */
export interface PayoutTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface PayoutLockRow {
    id: string;
    deal_id: string;
    payee_id: string | null;
    coin: string;
    network: string;
    address: string | null;
    amount_coin: string | null;
    amount_smallest_unit: string | null;
    preflight_status: string | null;
    gas_reserve_status: string | null;
    status: string;
    hold_until: Date | string | null;
    tx_hash: string | null;
    version_no: number;
}
/** Lock the payout-queue row for the duration of the transaction. */
export declare function lockPayout(tx: PayoutTxClient, payoutId: string): Promise<PayoutLockRow | null>;
export interface DealPayoutRow {
    id: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    status: string;
    coin: string;
    network: string;
    amount_smallest_unit: string | null;
    legal_hold: boolean;
    version_no: number;
}
/** Lock and read the money-relevant deal columns for the transaction. */
export declare function lockDealForPayout(tx: PayoutTxClient, dealId: string): Promise<DealPayoutRow | null>;
/** Record the preflight summary on the payout row (real columns). */
export declare function setPayoutPreflightStatus(tx: PayoutTxClient, payoutId: string, status: string): Promise<void>;
/**
 * Distinct operators who have previously recorded a preflight check for this
 * payout. Used to source the two-step dual-control approver set from a REAL
 * column (`payout_preflight_checks.checked_by`) rather than fabricating ids.
 */
export declare function listPriorApprovers(tx: PayoutTxClient, payoutQueueId: string): Promise<string[]>;
/** True when the deal has an open/under-review dispute (blocks payout). */
export declare function hasOpenDispute(tx: PayoutTxClient, dealId: string): Promise<boolean>;
/** True when an active token contract is allowlisted for this coin/network. */
export declare function isTokenContractAllowlisted(tx: PayoutTxClient, coin: string, network: string): Promise<boolean>;
/**
 * Whether the deal's posted ledger nets to zero per (coin, network). A deal
 * with no entries is trivially balanced. Computed from the REAL `ledger_entries`
 * rows rather than assumed.
 */
export declare function isDealLedgerBalanced(tx: PayoutTxClient, dealId: string): Promise<boolean>;
/** True when a terminal refund event already exists for the deal (idempotency). */
export declare function hasProcessedRefund(tx: PayoutTxClient, dealId: string): Promise<boolean>;
/** Append a refund status event (real columns: deal_id, status_step, message). */
export declare function insertRefundStatusEvent(tx: PayoutTxClient, input: {
    dealId: string;
    statusStep: string;
    message: string;
}): Promise<string>;
/** Transition the deal to a terminal refunded state under its current status. */
export declare function markDealRefunded(tx: PayoutTxClient, dealId: string, fromStatus: string): Promise<void>;
//# sourceMappingURL=payouts-write.repository.d.ts.map