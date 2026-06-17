export type Chain = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
export type RiskTier = 'normal' | 'large' | 'suspicious';
/** Base thresholds from the spec. Solana is finalized-commitment (modeled 1). */
export declare function baseThreshold(chain: Chain): number;
/** Larger/suspicious deals demand deeper confirmations before funding. */
export declare function riskMultiplier(tier: RiskTier): number;
export declare function effectiveThreshold(chain: Chain, tier?: RiskTier): number;
export interface ConfirmationState {
    chain: Chain;
    confirmations: number;
    finalized?: boolean;
}
/**
 * The single funding predicate. For Solana, finalized commitment is required in
 * addition to meeting the (multiplied) finalized-slot count; for account/UTXO
 * chains the confirmation count must reach the effective threshold.
 */
export declare function meetsThreshold(state: ConfirmationState, tier?: RiskTier): boolean;
export type FundingDecision = 'fund' | 'wait';
export declare function fundingDecision(state: ConfirmationState, tier?: RiskTier): FundingDecision;
export interface ReorgOutcome {
    confirmations: number;
    shouldUnfund: boolean;
}
/**
 * Apply a reorg of `depth` blocks to a deposit that was previously funded.
 * Confirmations cannot go below zero. If the post-reorg count no longer meets
 * the threshold, the credit must be reversed.
 */
export declare function applyReorg(state: ConfirmationState, depth: number, tier?: RiskTier, wasFunded?: boolean): ReorgOutcome;
/**
 * Idempotent crediting key. A deposit is credited at most once per
 * (tx_hash, output_index), matching the payments unique constraint.
 */
export declare function creditKey(txHash: string, outputIndex: number): string;
//# sourceMappingURL=confirmations.d.ts.map