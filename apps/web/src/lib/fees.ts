/**
 * Client-side mirror of the server fee engine
 * (`apps/api/src/modules/money/fee-engine.ts`) for display-only estimates on the
 * public fees page and the deal builder.
 *
 * IMPORTANT: this is for UI estimation only. The authoritative fee is always
 * computed server-side and locked at funding time together with the live FX
 * rate and the real on-chain network gas. Network gas is intentionally NOT
 * modelled here because it depends on live chain conditions.
 *
 * All math is integer cents using BigInt with half-up rounding, identical to the
 * server, so the displayed estimate matches the server to the cent (excluding
 * gas).
 */
export const DEAL_MIN_USD_CENTS = 40_000;
export const DEAL_MAX_USD_CENTS = 5_000_000;
export const PLATFORM_FEE_MIN_CENTS = 3_000;
export const SETTLEMENT_FEE_BPS = 50;
export const BPS_DENOMINATOR = 10_000;

export interface PlatformFeeTier {
  readonly lowerInclusiveCents: number;
  readonly upperExclusiveCents: number;
  readonly bps: number;
}

export const PLATFORM_FEE_TIERS: readonly PlatformFeeTier[] = [
  { lowerInclusiveCents: 40_000, upperExclusiveCents: 150_000, bps: 500 },
  { lowerInclusiveCents: 150_000, upperExclusiveCents: 300_000, bps: 350 },
  { lowerInclusiveCents: 300_000, upperExclusiveCents: 500_000, bps: 300 },
  { lowerInclusiveCents: 500_000, upperExclusiveCents: 750_000, bps: 250 },
  { lowerInclusiveCents: 750_000, upperExclusiveCents: 1_200_000, bps: 200 },
  { lowerInclusiveCents: 1_200_000, upperExclusiveCents: 2_000_000, bps: 175 },
  { lowerInclusiveCents: 2_000_000, upperExclusiveCents: 5_000_001, bps: 135 },
];

export type FeePayer = 'buyer' | 'seller' | 'split';

function mulDivRoundHalfUp(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  return (amount * numerator + denominator / 2n) / denominator;
}

/** Select the applicable tier bps for a deal amount (boundary -> lower rate). */
export function selectPlatformFeeBps(dealAmountCents: number): number {
  for (const tier of PLATFORM_FEE_TIERS) {
    if (dealAmountCents >= tier.lowerInclusiveCents && dealAmountCents < tier.upperExclusiveCents) {
      return tier.bps;
    }
  }
  // At/above the top boundary, use the lowest rate.
  return PLATFORM_FEE_TIERS[PLATFORM_FEE_TIERS.length - 1]!.bps;
}

/** Percentage platform fee with the flat $30 minimum applied. */
export function platformFeeCents(dealAmountCents: number): number {
  const bps = selectPlatformFeeBps(dealAmountCents);
  const pct = Number(
    mulDivRoundHalfUp(BigInt(dealAmountCents), BigInt(bps), BigInt(BPS_DENOMINATOR)),
  );
  return Math.max(PLATFORM_FEE_MIN_CENTS, pct);
}

/** Seller settlement fee (0.5%). */
export function settlementFeeCents(dealAmountCents: number): number {
  return Number(
    mulDivRoundHalfUp(BigInt(dealAmountCents), BigInt(SETTLEMENT_FEE_BPS), BigInt(BPS_DENOMINATOR)),
  );
}

export interface FeeEstimate {
  dealAmountCents: number;
  appliedBps: number;
  platformFeeCents: number;
  settlementFeeCents: number;
  splitBuyerBps: number;
  buyerPlatformShareCents: number;
  sellerPlatformShareCents: number;
  /** True when the flat $30 minimum was applied instead of the percentage. */
  platformFeeFloorApplied: boolean;
  /** Live on-chain network (gas) cost, passed through with no markup. */
  transactionFeeCents: number;
  /** Platform fee + the 0.5% settlement fee — what TrustVexa keeps. */
  platformKeepsCents: number;
  /** The transaction (gas) fee — what the network takes. */
  networkTakesCents: number;
  buyerSendsCents: number;
  sellerReceivesCents: number;
}

/** Default buyer share of the platform fee on a split deal (50%). */
export const DEFAULT_SPLIT_BUYER_BPS = 5_000;

/**
 * Representative network (gas) cost per chain, in USD cents, for the display
 * calculator (2026 rates from the plan §7). Gas depends on the *network*, not
 * the coin. The real gas is read live and locked server-side at funding; this
 * is an estimate only. Keys match the deal `network` codes.
 */
export const NETWORK_GAS: Readonly<
  Record<string, { label: string; gasUsd: number; rangeLabel: string }>
> = {
  SOLANA: { label: 'Solana (SPL)', gasUsd: 0.001, rangeLabel: '~$0.001' },
  BNB: { label: 'BNB Chain (BEP-20)', gasUsd: 0.15, rangeLabel: '$0.05 – $0.30' },
  TRON: { label: 'TRON (TRC-20)', gasUsd: 1.0, rangeLabel: '$0.50 – $1.50' },
  ETH: { label: 'Ethereum (ERC-20)', gasUsd: 5.0, rangeLabel: '$2 – $10' },
};

/** Representative gas estimate (USD cents) for a network code, or 0 if unknown. */
export function estimateGasCents(network: string | undefined): number {
  if (!network) return 0;
  const g = NETWORK_GAS[network];
  return g ? Math.round(g.gasUsd * 100) : 0;
}

/**
 * Display-only fee breakdown matching the plan's Fee Calculator spec. The
 * platform fee is one total fee allocated per `feePayer` (for `split` the buyer
 * takes `splitBuyerBps`, agreed per deal — never forced to 50/50). On every
 * deal the seller also pays a flat 0.5% settlement fee plus the real network
 * (gas) cost out of their payout:
 *
 *   Buyer sends     = Deal amount + buyer's platform share
 *   Seller receives = Deal amount − seller's platform share − 0.5% settlement − gas
 *   Platform keeps  = Platform fee + 0.5% settlement
 *   Network takes   = gas
 */
export function estimateFees(
  dealAmountCents: number,
  feePayer: FeePayer,
  splitBuyerBps: number = DEFAULT_SPLIT_BUYER_BPS,
  gasFeeCents = 0,
): FeeEstimate {
  const platform = platformFeeCents(dealAmountCents);
  const settlement = settlementFeeCents(dealAmountCents);
  const gas = Math.max(0, Math.round(gasFeeCents));
  const rawPct = Number(
    mulDivRoundHalfUp(
      BigInt(dealAmountCents),
      BigInt(selectPlatformFeeBps(dealAmountCents)),
      BigInt(BPS_DENOMINATOR),
    ),
  );
  const platformFeeFloorApplied = rawPct < PLATFORM_FEE_MIN_CENTS;

  const bps = Math.max(0, Math.min(BPS_DENOMINATOR, Math.round(splitBuyerBps)));
  let buyerPlatform = 0;
  let sellerPlatform = 0;
  if (feePayer === 'buyer') {
    buyerPlatform = platform;
  } else if (feePayer === 'seller') {
    sellerPlatform = platform;
  } else {
    buyerPlatform = Number(
      mulDivRoundHalfUp(BigInt(platform), BigInt(bps), BigInt(BPS_DENOMINATOR)),
    );
    sellerPlatform = platform - buyerPlatform;
  }

  return {
    dealAmountCents,
    appliedBps: selectPlatformFeeBps(dealAmountCents),
    platformFeeCents: platform,
    settlementFeeCents: settlement,
    splitBuyerBps: feePayer === 'split' ? bps : DEFAULT_SPLIT_BUYER_BPS,
    buyerPlatformShareCents: buyerPlatform,
    sellerPlatformShareCents: sellerPlatform,
    platformFeeFloorApplied,
    transactionFeeCents: gas,
    platformKeepsCents: platform + settlement,
    networkTakesCents: gas,
    buyerSendsCents: dealAmountCents + buyerPlatform,
    sellerReceivesCents: dealAmountCents - sellerPlatform - settlement - gas,
  };
}

const FIAT_RATES: Record<string, { symbol: string; rate: number; locale: string }> = {
  USD: { symbol: '$', rate: 1.0, locale: 'en-US' },
  EUR: { symbol: '€', rate: 0.92, locale: 'de-DE' },
  GBP: { symbol: '£', rate: 0.79, locale: 'en-GB' },
};

function getFiatRate(currency: string): { symbol: string; rate: number; locale: string } {
  const rate = FIAT_RATES[currency];
  if (rate) return rate;
  const usdRate = FIAT_RATES['USD'];
  if (usdRate) return usdRate;
  return { symbol: '$', rate: 1.0, locale: 'en-US' };
}

/** Format a small USD gas amount with sub-cent precision where needed. */
export function formatGasUsd(usd: number): string {
  let currency = 'USD';
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )FIAT=([^;]*)/);
    if (match && match[1] && FIAT_RATES[match[1]]) {
      currency = match[1];
    }
  }

  const c = getFiatRate(currency);
  const converted = usd * c.rate;
  if (converted > 0 && converted < 0.01) {
    return `~${c.symbol}${converted.toFixed(3)}`;
  }
  return `~${converted.toLocaleString(c.locale, {
    style: 'currency',
    currency,
  })}`;
}

/** Gas as a percentage of the deal, with adaptive precision for tiny values. */
export function formatGasPctOfDeal(gasUsd: number, dealAmountCents: number): string {
  const dealUsd = dealAmountCents / 100;
  if (dealUsd <= 0) return '—';
  const pct = (gasUsd / dealUsd) * 100;
  const decimals = pct < 0.01 ? 4 : pct < 1 ? 3 : 2;
  return `${pct.toLocaleString('en-US', { maximumFractionDigits: decimals })}%`;
}

/** Format integer USD cents as a formatted currency string. */
export function formatUsdCents(cents: number): string {
  let currency = 'USD';
  if (typeof window !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )FIAT=([^;]*)/);
    if (match && match[1] && FIAT_RATES[match[1]]) {
      currency = match[1];
    }
  }

  const c = getFiatRate(currency);
  const converted = (cents / 100) * c.rate;
  return converted.toLocaleString(c.locale, {
    style: 'currency',
    currency,
  });
}

/** Format bps (e.g. 350) as a percent string (e.g. "3.5%"). */
export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}
