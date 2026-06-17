export interface HandoverDealAccessRow {
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    status: string;
}
export declare function getDealAccess(dealId: string): Promise<HandoverDealAccessRow | null>;
export interface HandoverItemRow {
    id: string;
    item_type: string;
    verification_status: string;
    reveal_status: string;
    transferred_to_buyer_at: Date | string | null;
    created_at: Date | string;
}
export declare function listHandoverItems(dealId: string): Promise<HandoverItemRow[]>;
export interface HandoverItemDetailRow {
    id: string;
    deal_id: string;
    item_type: string;
    verification_status: string;
    reveal_status: string;
    transferred_to_buyer_at: Date | string | null;
    created_at: Date | string;
}
/** Single handover item with its owning deal id, for access checks before a reveal. */
export declare function getHandoverItemById(itemId: string): Promise<HandoverItemDetailRow | null>;
//# sourceMappingURL=handover-read.repository.d.ts.map