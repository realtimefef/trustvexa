import { type FeePayer } from '../money/fee-engine.js';
export interface PublicFeeTierRow {
    fromCents: bigint;
    toCents: bigint;
    from: string;
    to: string;
    percent: string;
    isLast: boolean;
}
/** Render the sliding-scale fee tiers for the public fees table. */
export declare function buildFeeTable(): PublicFeeTierRow[];
export interface PublicFeeSummary {
    dealRange: {
        min: string;
        max: string;
    };
    minPlatformFee: string;
    settlementFeePercent: string;
    gasNote: string;
    boundaryNote: string;
}
export declare function buildFeeSummary(): PublicFeeSummary;
export interface PublicFeeExampleLine {
    key: string;
    label: string;
    amount: string;
}
export interface PublicFeeExample {
    dealAmount: string;
    feePayer: FeePayer;
    lines: PublicFeeExampleLine[];
}
export declare const DEFAULT_EXAMPLE_AMOUNTS_CENTS: readonly bigint[];
/**
 * Worked examples for the fees page. Gas is illustrative (caller supplies a
 * live estimate in production); pass 0 to show the fee-only breakdown.
 */
export declare function buildFeeExamples(amountsCents?: readonly bigint[], feePayer?: FeePayer, gasFeeCents?: bigint): PublicFeeExample[];
//# sourceMappingURL=fees-presenter.d.ts.map