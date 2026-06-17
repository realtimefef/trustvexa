export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface TreasurySnapshotRow {
    id: string;
    snapshot_at: string;
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
    created_at: string;
}
export interface InsertSnapshotInput {
    coin: string;
    network: string;
    heldInEscrow: bigint;
    owedToSellers: bigint;
    refundsOwed: bigint;
    platformFeeRevenue: bigint;
    gasSpent: bigint;
    hotBalance: bigint;
    coldBalance: bigint;
    ledgerBalance: bigint;
    onchainBalance: bigint;
    reconciled: boolean;
}
export declare function insertSnapshot(tx: TxClient, input: InsertSnapshotInput): Promise<TreasurySnapshotRow>;
export declare function latestSnapshot(tx: TxClient, coin: string, network: string): Promise<TreasurySnapshotRow | null>;
//# sourceMappingURL=treasury.repository.d.ts.map