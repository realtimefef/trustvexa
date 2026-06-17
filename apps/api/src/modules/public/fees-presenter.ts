// Public fees page content, derived LIVE from the canonical fee engine so the
// marketing page can never drift from the engine. (task 8.1, Requirement 42.2)
// All math stays in the engine; this module only shapes + formats it.
import {
  PLATFORM_FEE_TIERS,
  PLATFORM_FEE_MIN_CENTS,
  SETTLEMENT_FEE_BPS,
  DEAL_MIN_USD_CENTS,
  DEAL_MAX_USD_CENTS,
  computeFeeBreakdown,
  buildLineItems,
  type FeePayer,
} from '../money/fee-engine.js';
import { formatBps, formatUsdCents } from './format.js';

export interface PublicFeeTierRow {
  fromCents: bigint;
  toCents: bigint;
  from: string;
  to: string;
  percent: string;
  isLast: boolean;
}

/** Render the sliding-scale fee tiers for the public fees table. */
export function buildFeeTable(): PublicFeeTierRow[] {
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

export interface PublicFeeSummary {
  dealRange: { min: string; max: string };
  minPlatformFee: string;
  settlementFeePercent: string;
  gasNote: string;
  boundaryNote: string;
}

export function buildFeeSummary(): PublicFeeSummary {
  return {
    dealRange: { min: formatUsdCents(DEAL_MIN_USD_CENTS), max: formatUsdCents(DEAL_MAX_USD_CENTS) },
    minPlatformFee: formatUsdCents(PLATFORM_FEE_MIN_CENTS),
    settlementFeePercent: formatBps(SETTLEMENT_FEE_BPS),
    gasNote: 'Network gas is passed through at live cost with no markup.',
    boundaryNote: 'Amounts on a tier boundary use the lower adjacent rate.',
  };
}

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

export const DEFAULT_EXAMPLE_AMOUNTS_CENTS: readonly bigint[] = [
  100_000n, // $1,000
  500_000n, // $5,000
  2_500_000n, // $25,000
];

/**
 * Worked examples for the fees page. Gas is illustrative (caller supplies a
 * live estimate in production); pass 0 to show the fee-only breakdown.
 */
export function buildFeeExamples(
  amountsCents: readonly bigint[] = DEFAULT_EXAMPLE_AMOUNTS_CENTS,
  feePayer: FeePayer = 'split',
  gasFeeCents = 0n,
): PublicFeeExample[] {
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
