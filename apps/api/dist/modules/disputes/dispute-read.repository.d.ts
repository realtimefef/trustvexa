export interface DealAccessRow {
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    status: string;
}
export declare function getDealAccess(dealId: string): Promise<DealAccessRow | null>;
export interface DisputeRow {
    id: string;
    deal_id: string;
    raised_by: string | null;
    reason: string | null;
    status: string;
    resolution: string | null;
    final_decision_note: string | null;
    decision_pdf_key: string | null;
    resolved_at: Date | string | null;
    created_at: Date | string;
}
export declare function getDisputeByDeal(dealId: string): Promise<DisputeRow | null>;
export interface EvidenceRow {
    id: string;
    file_hash: string;
    mime_type: string;
    uploaded_by: string | null;
    review_status: string;
    locked_at: Date | string | null;
    created_at: Date | string;
}
export declare function listEvidence(disputeId: string): Promise<EvidenceRow[]>;
export interface ThreadRow {
    id: string;
    status: string;
    locked_at: Date | string | null;
    created_at: Date | string;
}
export declare function listThreads(disputeId: string): Promise<ThreadRow[]>;
/**
 * Access row for a dispute resolved by its own id, joined to the owning deal so
 * the service can authorize the caller as a party (buyer/seller/middleman). A
 * non-party — or a missing dispute — yields `null`, which the service maps to
 * an opaque 404 so the endpoint never confirms someone else's dispute exists.
 */
export interface DisputeAccessRow {
    dispute_id: string;
    deal_id: string;
    dispute_status: string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
}
export declare function getDisputeAccess(disputeId: string): Promise<DisputeAccessRow | null>;
export interface ThreadMessageRow {
    id: string;
    thread_id: string;
    sender_id: string | null;
    body_enc: string | null;
    role: string | null;
    created_at: Date | string;
}
/** List every thread message for a dispute (across its threads), oldest first. */
export declare function listThreadMessages(disputeId: string): Promise<ThreadMessageRow[]>;
//# sourceMappingURL=dispute-read.repository.d.ts.map