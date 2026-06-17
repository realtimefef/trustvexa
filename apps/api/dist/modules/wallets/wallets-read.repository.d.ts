export interface AddressBookRow {
    id: string;
    label: string | null;
    coin: string | null;
    network: string | null;
    address_enc: string | null;
    validation_status: string | null;
    created_at: Date | string;
}
export declare function listAddressBook(userId: string): Promise<AddressBookRow[]>;
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
export declare function listChangeRequests(userId: string): Promise<ChangeRequestRow[]>;
//# sourceMappingURL=wallets-read.repository.d.ts.map