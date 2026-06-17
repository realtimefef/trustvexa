export interface DealDocAccessRow {
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    status: string;
}
export declare function getDealAccess(dealId: string): Promise<DealDocAccessRow | null>;
//# sourceMappingURL=documents-read.repository.d.ts.map