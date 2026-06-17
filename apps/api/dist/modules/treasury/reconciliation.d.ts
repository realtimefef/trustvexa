export type ReconciliationStatus = 'reconciled' | 'mismatch' | 'shortfall' | 'surplus';
export interface TreasurySnapshotInput {
    coin: string;
    network: string;
    ledgerBalance: bigint;
    onchainBalance: bigint;
    /** Optional tolerance (smallest units) to absorb dust/gas timing. */
    toleranceUnits?: bigint;
}
export interface ReconciliationResult {
    coin: string;
    network: string;
    status: ReconciliationStatus;
    reconciled: boolean;
    /** onchain - ledger; negative means custody holds less than the ledger claims. */
    delta: bigint;
    mismatchAlert: boolean;
}
export declare function reconcile(input: TreasurySnapshotInput): ReconciliationResult;
/** A shortfall (custody below ledger) is the urgent, alert-worthy case. */
export declare function isShortfall(result: ReconciliationResult): boolean;
//# sourceMappingURL=reconciliation.d.ts.map