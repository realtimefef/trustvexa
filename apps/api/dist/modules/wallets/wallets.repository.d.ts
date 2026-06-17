/** Minimal transactional client (pg.PoolClient satisfies this). */
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface AddressBookRow {
    id: string;
    label: string | null;
    coin: string | null;
    network: string | null;
    address_enc: string | null;
    validation_status: string | null;
    created_at: Date | string;
}
export interface InsertAddressInput {
    userId: string;
    label: string;
    coin: string;
    network: string;
    /**
     * Address payload for the `address_enc` column. The KEK-backed KeyProvider is
     * not wired into the API runtime yet (the deal-draft and auth modules defer
     * their `*_enc` columns the same way), so the address is stored as-is for now.
     * When the KeyProvider lands, encrypt with `encryptField(provider, 'pii', ...)`.
     */
    addressEnc: string;
    addressHash: string;
    validationStatus: string;
}
/** Find the caller's saved wallet by its deterministic address hash. */
export declare function findAddressByHash(tx: TxClient, userId: string, addressHash: string): Promise<AddressBookRow | null>;
export declare function insertAddress(tx: TxClient, input: InsertAddressInput): Promise<AddressBookRow>;
/** Delete one of the caller's saved wallets. Returns rows removed (0 or 1). */
export declare function deleteAddress(userId: string, id: string): Promise<number>;
export interface InsertValidationCheckInput {
    userId: string;
    dealId: string | null;
    coin: string;
    network: string;
    addressHash: string;
    result: string;
    message: string;
}
/** Record a validation check (audit trail) without touching the address book. */
export declare function insertValidationCheck(input: InsertValidationCheckInput): Promise<void>;
export interface ChangeRequestRow {
    id: string;
    deal_id: string | null;
    wallet_type: string;
    old_address_enc: string | null;
    new_address_enc: string | null;
    status: string | null;
    hold_until: Date | string | null;
    confirmed_at: Date | string | null;
    created_at: Date | string;
}
export interface InsertChangeRequestInput {
    userId: string;
    dealId: string | null;
    walletType: 'refund' | 'payout';
    /** Stored as-is in `old_address_enc` (see InsertAddressInput note on `*_enc`). */
    oldAddressEnc: string | null;
    /** Stored as-is in `new_address_enc` (see InsertAddressInput note on `*_enc`). */
    newAddressEnc: string;
    status: string;
    holdUntil: Date;
}
/**
 * Find an in-flight (pending) change request that matches the caller, wallet
 * type, and target address. Used to make creation idempotent: re-submitting the
 * same change while one is still pending returns the existing row rather than
 * stacking duplicates. `wallet_change_requests` has no address-hash column, so
 * the comparison is on the stored `new_address_enc` payload directly.
 */
export declare function findPendingChangeRequest(tx: TxClient, userId: string, walletType: 'refund' | 'payout', newAddress: string): Promise<ChangeRequestRow | null>;
export declare function insertChangeRequest(tx: TxClient, input: InsertChangeRequestInput): Promise<ChangeRequestRow>;
//# sourceMappingURL=wallets.repository.d.ts.map