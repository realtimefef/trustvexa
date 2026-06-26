/**
 * Write-side data access for dispute resolution (task 7.5). Each helper takes
 * the shared money-write transaction client so the settlement record, the
 * decision document, and the deal-state transition all commit atomically with
 * the ledger postings. Not barrel-exported. (Requirements 24.4-24.7)
 */
import type { DisputeOutcome } from './dispute-resolution.js';
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface DealMoneyRow {
    id: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    preferred_middleman_id?: string | null;
    status: string;
    coin: string;
    network: string;
    amount_smallest_unit: string | null;
    deal_amount: string | null;
    version_no: number;
}
/**
 * Lock and read the money-relevant deal columns for the duration of the
 * resolution transaction. `FOR UPDATE` serializes any concurrent money write
 * on the same deal alongside the `version_no` optimistic lock.
 */
export declare function lockDealForSettlement(tx: TxClient, dealId: string): Promise<DealMoneyRow | null>;
/** Insert the settlement record describing how the escrow was distributed. */
export declare function insertSettlement(tx: TxClient, input: {
    dealId: string;
    type: DisputeOutcome;
    buyerRefundSmallestUnit: bigint;
    sellerReleaseSmallestUnit: bigint;
    reason: string;
    decidedBy: string;
}): Promise<string>;
/** Record the rendered decision document in `deal_documents`. */
export declare function insertDecisionDocument(tx: TxClient, input: {
    dealId: string;
    documentNumber: string;
    fileKey: string;
    createdBy: string;
}): Promise<string>;
//# sourceMappingURL=dispute-write.repository.d.ts.map