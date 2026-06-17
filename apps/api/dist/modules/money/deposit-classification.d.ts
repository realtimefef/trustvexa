export type MatchStatus = 'matched' | 'underpaid' | 'overpaid' | 'wrong_network' | 'wrong_coin' | 'fake_token';
export type DepositAction = 'fund' | 'fund_and_refund_excess' | 'await_topup_or_refund_minus_gas' | 'flag_misdirected_no_fund' | 'reject_no_credit';
/** Coins that are smart-contract tokens and therefore require allowlist proof. */
export declare const TOKEN_COINS: ReadonlySet<string>;
export declare function isTokenCoin(coin: string): boolean;
export interface ExpectedDeposit {
    coin: string;
    network: string;
    amountSmallestUnit: bigint;
    tolerancePct?: number;
}
export interface IncomingTransfer {
    coin: string;
    network: string;
    amountSmallestUnit: bigint;
    tokenContractAddress?: string;
}
export interface AllowlistEntry {
    coin: string;
    network: string;
    contractAddress: string;
    isActive: boolean;
}
export interface DepositClassification {
    status: MatchStatus;
    action: DepositAction;
    credited: boolean;
    creditAmountSmallestUnit: bigint;
    refundExcessSmallestUnit: bigint;
    shortfallSmallestUnit: bigint;
}
export declare function classifyDeposit(expected: ExpectedDeposit, incoming: IncomingTransfer, allowlist?: readonly AllowlistEntry[]): DepositClassification;
//# sourceMappingURL=deposit-classification.d.ts.map