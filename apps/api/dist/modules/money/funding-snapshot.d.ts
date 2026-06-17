import type { FeePayer } from './fee-engine.js';
export interface FundingSnapshotInput {
    coin: string;
    network: string;
    dealAmount: bigint;
    feePayer: FeePayer;
    platformFee: bigint;
    sellerSettlementFee: bigint;
    transactionFee: bigint;
    buyerTotal: bigint;
    sellerPayout: bigint;
    amountCoin: string;
    amountSmallestUnit: bigint;
    lockedFxRate: string;
    fxSource: string;
}
export interface FundingSnapshot {
    readonly coin: string;
    readonly network: string;
    readonly dealAmount: bigint;
    readonly feePayer: FeePayer;
    readonly platformFee: bigint;
    readonly sellerSettlementFee: bigint;
    readonly transactionFee: bigint;
    readonly buyerTotal: bigint;
    readonly sellerPayout: bigint;
    readonly amountCoin: string;
    readonly amountSmallestUnit: bigint;
    readonly lockedFxRate: string;
    readonly fxSource: string;
}
export declare const FUNDING_SNAPSHOT_FIELDS: readonly ["coin", "network", "dealAmount", "feePayer", "platformFee", "sellerSettlementFee", "transactionFee", "buyerTotal", "sellerPayout", "amountCoin", "amountSmallestUnit", "lockedFxRate", "fxSource"];
export declare class FundingSnapshotError extends Error {
    constructor(message: string);
}
export declare class FundingSnapshotMutationError extends Error {
    readonly changedFields: ReadonlyArray<keyof FundingSnapshot>;
    constructor(changedFields: ReadonlyArray<keyof FundingSnapshot>);
}
/**
 * Build a validated, deeply frozen funding snapshot. The model-independent
 * conservation invariant `buyerTotal - sellerPayout === platformFee +
 * sellerSettlementFee + transactionFee` ties the snapshot to the double-entry
 * ledger regardless of who pays the fees.
 */
export declare function buildFundingSnapshot(input: FundingSnapshotInput): FundingSnapshot;
/** Return the snapshot fields whose values differ between two snapshots. */
export declare function diffSnapshot(a: FundingSnapshot, b: FundingSnapshot): Array<keyof FundingSnapshot>;
/**
 * Guard a re-persist/update: the incoming snapshot must be byte-for-byte equal
 * to the stored one, otherwise the write is an illegal mutation.
 */
export declare function assertSnapshotImmutable(stored: FundingSnapshot, incoming: FundingSnapshot): void;
//# sourceMappingURL=funding-snapshot.d.ts.map