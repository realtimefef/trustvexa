import type { TxClient } from './deal.repository.js';
import type { FeePayer, NetworkMode } from './deal-creation.service.js';
export interface InsertDealParams {
    sellerId: string;
    buyerId?: string | null;
    coin: string;
    network: string;
    networkMode: NetworkMode;
    isPractice: boolean;
    dealAmountCents: number;
    feePayer: FeePayer;
    feeSplitBuyerBps: number | null;
    priceTolerancePct: number | null;
    templateId: string | null;
    productId: string | null;
    preferredMiddlemanId?: string | null;
}
export interface InsertedDealRow {
    id: string;
    status: string;
    created_at: string;
}
/**
 * Insert a fresh deal. `buyer_id` is set when the deal is created from a
 * connection (both parties already known); otherwise it is left NULL and the
 * counterparty joins later. `middleman_id` is always NULL at creation.
 * `status` defaults to 'Created', `version_no` to 0, `attempt_no` to 1.
 */
export declare function insertDeal(client: TxClient, params: InsertDealParams): Promise<InsertedDealRow>;
/** Insert a versioned terms snapshot for a deal. */
export declare function insertDealTermsSnapshot(client: TxClient, dealId: string, version: number, termsSnapshot: string): Promise<void>;
export interface DuplicableDealRow {
    coin: string;
    network: string;
    network_mode: NetworkMode;
    is_practice: boolean;
    deal_amount: number | null;
    fee_payer: FeePayer | null;
    fee_split_buyer_bps: number | null;
    price_tolerance_pct: number | null;
    template_id: string | null;
    product_id: string | null;
}
/**
 * Load just the clonable settings of a past deal, scoped to its owner. Returns
 * null when the deal does not exist OR is not owned by the requesting seller,
 * so duplication can never leak another user's deal (Requirement 8.7). The
 * query deliberately omits buyer/middleman ids and all computed money columns.
 */
export declare function loadDealForDuplication(client: TxClient, dealId: string, sellerId: string): Promise<DuplicableDealRow | null>;
/** Load the latest terms snapshot text for a deal (or null when none exists). */
export declare function loadLatestTermsSnapshot(client: TxClient, dealId: string): Promise<string | null>;
export interface DraftRow {
    id: string;
    draft_data_enc: string | null;
    last_step: string | null;
    updated_at: string;
    created_at: string;
}
export interface DraftSummaryRow {
    id: string;
    last_step: string | null;
    updated_at: string;
    created_at: string;
}
export declare function insertDraft(userId: string, dataEnc: string, lastStep: string): Promise<DraftSummaryRow>;
export declare function updateDraft(userId: string, draftId: string, dataEnc: string, lastStep: string): Promise<DraftSummaryRow | null>;
export declare function getDraft(userId: string, draftId: string): Promise<DraftRow | null>;
export declare function listDrafts(userId: string): Promise<DraftSummaryRow[]>;
export declare function deleteDraft(userId: string, draftId: string): Promise<number>;
//# sourceMappingURL=deal-creation.repository.d.ts.map