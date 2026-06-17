// Public fees page content, derived LIVE from the canonical fee engine so the
// marketing page can never drift from the engine. (task 8.1, Requirement 42.2)
// All math stays in the engine; this module only shapes + formats it.
import { PLATFORM_FEE_TIERS, PLATFORM_FEE_MIN_CENTS, SETTLEMENT_FEE_BPS, DEAL_MIN_USD_CENTS, DEAL_MAX_USD_CENTS, computeFeeBreakdown, buildLineItems, } from '../money/fee-engine.js';
import { formatBps, formatUsdCents } from './format.js';
/** Render the sliding-scale fee tiers for the public fees table. */
export function buildFeeTable() {
    const tiers = PLATFORM_FEE_TIERS;
    return tiers.map((tier, idx) => {
        const isLast = idx === tiers.length - 1;
        // Display upper bound as the published boundary (exclusive minus the cap
        // overshoot on the final tier, which includes the $50,000 maximum).
        const toCents = isLast ? DEAL_MAX_USD_CENTS : tier.upperExclusiveCents;
        return {
            fromCents: tier.lowerInclusiveCents,
            toCents,
            from: formatUsdCents(tier.lowerInclusiveCents),
            to: formatUsdCents(toCents),
            percent: formatBps(tier.bps),
            isLast,
        };
    });
}
export function buildFeeSummary() {
    return {
        dealRange: { min: formatUsdCents(DEAL_MIN_USD_CENTS), max: formatUsdCents(DEAL_MAX_USD_CENTS) },
        minPlatformFee: formatUsdCents(PLATFORM_FEE_MIN_CENTS),
        settlementFeePercent: formatBps(SETTLEMENT_FEE_BPS),
        gasNote: 'Network gas is passed through at live cost with no markup.',
        boundaryNote: 'Amounts on a tier boundary use the lower adjacent rate.',
    };
}
export const DEFAULT_EXAMPLE_AMOUNTS_CENTS = [
    100000n, // $1,000
    500000n, // $5,000
    2500000n, // $25,000
];
/**
 * Worked examples for the fees page. Gas is illustrative (caller supplies a
 * live estimate in production); pass 0 to show the fee-only breakdown.
 */
export function buildFeeExamples(amountsCents = DEFAULT_EXAMPLE_AMOUNTS_CENTS, feePayer = 'split', gasFeeCents = 0n) {
    return amountsCents.map((dealAmountCents) => {
        const breakdown = computeFeeBreakdown({ dealAmountCents, feePayer, gasFeeCents });
        return {
            dealAmount: formatUsdCents(dealAmountCents),
            feePayer,
            lines: buildLineItems(breakdown).map((li) => ({
                key: li.key,
                label: li.label,
                amount: formatUsdCents(li.amountCents),
            })),
        };
    });
}
//# sourceMappingURL=fees-presenter.js.map