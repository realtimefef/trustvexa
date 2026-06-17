export interface TreasuryLine {
    coin: string;
    network: string;
    heldInEscrow: string;
    owedToSellers: string;
    refundsOwed: string;
    platformFeeRevenue: string;
    gasSpent: string;
    hotBalance: string;
    coldBalance: string;
    ledgerBalance: string;
    onchainBalance: string;
    /** onchain - ledger in smallest units. '0' when fully reconciled. */
    deltaSmallestUnit: string;
    reconciled: boolean;
    /** True when not reconciled or the on-chain/ledger balances diverge. */
    mismatch: boolean;
    snapshotAt: string;
}
export interface TreasuryView {
    lines: TreasuryLine[];
    mismatchCount: number;
}
export declare function getTreasury(): Promise<TreasuryView>;
//# sourceMappingURL=treasury.service.d.ts.map