export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface HandoverItemRow {
    id: string;
    deal_id: string;
    seller_id: string;
    middleman_id: string | null;
    encrypted_payload: string;
    item_type: string;
    verification_status: string;
    reveal_status: string;
    transferred_to_buyer_at: string | null;
    created_at: string;
}
export declare function createHandoverItem(tx: TxClient, input: {
    dealId: string;
    sellerId: string;
    encryptedPayload: string;
    itemType: 'account' | 'digital_product';
}): Promise<HandoverItemRow>;
/** Reveal credentials to the buyer (middleman action); also stamps transfer time. */
export declare function revealToBuyer(tx: TxClient, itemId: string, middlemanId: string): Promise<number>;
export declare function addVaultSecret(tx: TxClient, input: {
    handoverItemId: string;
    secretType: 'login' | 'recovery' | 'file_link' | 'note';
    secretEnc: string;
}): Promise<string>;
export declare function logAccess(tx: TxClient, input: {
    handoverItemId: string;
    viewerId: string;
    accessType: 'view' | 'reveal' | 'download';
}): Promise<void>;
//# sourceMappingURL=handover.repository.d.ts.map