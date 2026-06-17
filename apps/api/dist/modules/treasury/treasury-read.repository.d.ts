export interface TreasurySnapshotRow {
    coin: string;
    network: string;
    held_in_escrow: string;
    owed_to_sellers: string;
    refunds_owed: string;
    platform_fee_revenue: string;
    gas_spent: string;
    hot_balance: string;
    cold_balance: string;
    ledger_balance: string;
    onchain_balance: string;
    reconciled: boolean;
    snapshot_at: Date | string;
    created_at: Date | string;
}
/** The latest snapshot for every coin/network pair, newest first. */
export declare function listLatestSnapshots(): Promise<TreasurySnapshotRow[]>;
//# sourceMappingURL=treasury-read.repository.d.ts.map