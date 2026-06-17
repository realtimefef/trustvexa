export type LedgerDirection = 'debit' | 'credit';
export type LedgerAccountType = 'hot_wallet_asset' | 'cold_wallet_asset' | 'escrow_liability' | 'platform_fee_revenue' | 'network_fee_expense' | 'seller_payable' | 'refund_payable';
export interface LedgerPosting {
    readonly accountType: LedgerAccountType;
    readonly direction: LedgerDirection;
    readonly amountSmallestUnit: bigint;
    readonly coin: string;
    readonly network: string;
    readonly reason: string;
    readonly ownerUserId?: string | null;
    readonly dealId?: string | null;
}
export interface EntryGroup {
    readonly entryGroupId: string;
    readonly postings: readonly LedgerPosting[];
}
export interface CoinImbalance {
    readonly coin: string;
    readonly network: string;
    readonly debit: bigint;
    readonly credit: bigint;
}
export declare class LedgerImbalanceError extends Error {
    readonly imbalances: readonly CoinImbalance[];
    constructor(imbalances: readonly CoinImbalance[]);
}
/** Per-(coin, network) debit/credit totals that do not net to zero. */
export declare function groupImbalances(postings: readonly LedgerPosting[]): CoinImbalance[];
/** True when the postings net to zero per coin/network and are non-empty. */
export declare function isBalanced(postings: readonly LedgerPosting[]): boolean;
/** Throw `LedgerImbalanceError` unless the group is non-empty and balanced. */
export declare function assertBalanced(group: EntryGroup): void;
interface PairContext {
    readonly coin: string;
    readonly network: string;
    readonly dealId?: string | null;
    readonly ownerUserId?: string | null;
}
export declare function depositFundedPostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function platformFeePostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function settlementFeePostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function gasPassthroughPostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function platformGasExpensePostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function sellerPayoutPostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function buyerRefundPostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export declare function coldSweepPostings(ctx: PairContext, amount: bigint, id?: string): EntryGroup;
export interface DealSettlementAmounts {
    readonly coin: string;
    readonly network: string;
    readonly dealId: string;
    /** Total escrowed (what the buyer sent into escrow), in smallest units. */
    readonly escrowedSmallestUnit: bigint;
    readonly platformFeeSmallestUnit: bigint;
    readonly settlementFeeSmallestUnit: bigint;
    readonly gasSmallestUnit: bigint;
    readonly sellerReleaseSmallestUnit: bigint;
    readonly buyerRefundSmallestUnit: bigint;
}
/**
 * Verify escrowed funds are fully accounted for. *(Requirement 24.7)*
 *   escrowed === sellerRelease + platformFee + settlementFee + gas + buyerRefund
 */
export declare function assertEscrowConserved(amounts: DealSettlementAmounts): void;
/**
 * Build the full set of balanced entry groups that settle a deal. Conservation
 * is asserted first; zero-amount legs are omitted. Each returned group balances
 * independently, so the whole ledger remains balanced. *(Requirements 17.6, 24.7)*
 */
export declare function buildSettlementGroups(amounts: DealSettlementAmounts): EntryGroup[];
/** Net debit-minus-credit per (coin, network) across many groups. */
export declare function netByCoin(groups: readonly EntryGroup[]): Map<string, bigint>;
export {};
//# sourceMappingURL=ledger.d.ts.map