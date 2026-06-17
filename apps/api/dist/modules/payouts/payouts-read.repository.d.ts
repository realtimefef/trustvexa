import type { PayoutQueueStatus } from '../money/payout-queue.js';
/** A payout-queue row joined to the parties needed for access control. */
export interface PayoutQueueListRow {
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
    status: PayoutQueueStatus;
    hold_until: Date | string | null;
    tx_hash: string | null;
    version_no: number;
    created_at: Date | string;
}
/**
 * List the pending/approved payouts whose deal is assigned to this middleman.
 * Scoping by `deals.middleman_id` keeps the queue consistent with the
 * assigned-middleman authorization enforced on the write endpoints.
 */
export declare function listQueueForMiddleman(middlemanId: string, limit?: number): Promise<PayoutQueueListRow[]>;
//# sourceMappingURL=payouts-read.repository.d.ts.map