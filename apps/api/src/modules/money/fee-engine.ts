/**
 * Pure, deterministic platform-fee and payout engine. *(Requirements 15, 16)*
 *
 * All figures are integer USD cents (`bigint`); no floating-point is used. The
 * engine is currency-neutral for tiering: `deal_amount` is USD and the coin
 * denomination is layered on at funding time via the locked FX rate
 * (task 5.15). Every input here is server-held; client-supplied amounts are
 * never accepted (see `money-guard.ts`). *(Requirements 17.1, 17.2)*
 */

export type FeePayer = 'buyer' | 'seller' | 'split';

/** Deal amount bounds in USD cents. $400 – $50,000 inclusive. */
export const DEAL_MIN_USD_CENTS = 40_000n;
export const DEAL_MAX_USD_CENTS = 5_000_000n;

/** Flat minimum platform fee: $30. *(Requirement 15.3)* */
export const PLATFORM_FEE_MIN_CENTS = 3_000n;

/** Settlement fee: 0.5% of the deal, on every deal. *(Requirement 16.1)* */
export const SETTLEMENT_FEE_BPS = 50n;

/** Basis-point denominator (10,000 bps = 100%). */
export const BPS_DENOMINATOR = 10_000n;

/**
 * Default buyer share of the platform fee when `fee_payer === 'split'`, in basis
 * points. 5,000 bps = 50%, i.e. an even split with the buyer absorbing the odd
 * cent (round-half-up). A per-deal `splitBuyerBps` overrides this so the split
 * is whatever the buyer and seller agree to (e.g. 70/30), never forced to 50/50.
 * *(Requirement 15.5)*
 */
export const DEFAULT_SPLIT_BUYER_BPS = 5_000n;

/** Clamp an arbitrary split-share value into the valid [0, 10000] bps range. */
export function normalizeSplitBuyerBps(value: bigint | undefined): bigint {
  if (value === undefined) return DEFAULT_SPLIT_BUYER_BPS;
  if (value < 0n) return 0n;
  if (value > BPS_DENOMINATOR) return BPS_DENOMINATOR;
  return value;
}

/**
 * Sliding-scale platform-fee tiers. *(Requirements 15.1, 15.2)*
 *
 * Each tier is `[lowerInclusiveCents, upperExclusiveCents)`. A value that lands
 * exactly on a published boundary ($1,500/$3,000/$5,000/$7,500/$12,000/$20,000)
 * falls into the higher tier, which carries the **lower** adjacent percentage,
 * exactly as Requirement 15.2 mandates (e.g. $3,000 → 3%, $5,000 → 2.5%).
 */
export interface PlatformFeeTier {
  readonly lowerInclusiveCents: bigint;
  readonly upperExclusiveCents: bigint;
  readonly bps: bigint;
}

export const PLATFORM_FEE_TIERS: readonly PlatformFeeTier[] = [
  { lowerInclusiveCents: 40_000n, upperExclusiveCents: 150_000n, bps: 500n }, // 5%
  { lowerInclusiveCents: 150_000n, upperExclusiveCents: 300_000n, bps: 350n }, // 3.5%
  { lowerInclusiveCents: 300_000n, upperExclusiveCents: 500_000n, bps: 300n }, // 3%
  { lowerInclusiveCents: 500_000n, upperExclusiveCents: 750_000n, bps: 250n }, // 2.5%
  { lowerInclusiveCents: 750_000n, upperExclusiveCents: 1_200_000n, bps: 200n }, // 2%
  { lowerInclusiveCents: 1_200_000n, upperExclusiveCents: 2_000_000n, bps: 175n }, // 1.75%
  { lowerInclusiveCents: 2_000_000n, upperExclusiveCents: 5_000_001n, bps: 135n }, // 1.35% (incl. $50,000)
];

export function assertDealAmountInRange(dealAmountCents: bigint): void {
  if (dealAmountCents < DEAL_MIN_USD_CENTS || dealAmountCents > DEAL_MAX_USD_CENTS) {
    throw new Error(
      `Deal amount ${dealAmountCents} cents is outside the supported $400–$50,000 range`,
    );
  }
}

/** Multiply then divide with round-half-up, in exact integer (bigint) math. */
export function mulDivRoundHalfUp(amount: bigint, numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('denominator must be positive');
  if (amount < 0n) throw new Error('amount must be non-negative');
  return (amount * numerator + denominator / 2n) / denominator;
}

/** Select the applicable tier bps for a deal amount (boundary → lower rate). */
export function selectPlatformFeeBps(dealAmountCents: bigint): bigint {
  assertDealAmountInRange(dealAmountCents);
  for (const tier of PLATFORM_FEE_TIERS) {
    if (dealAmountCents >= tier.lowerInclusiveCents && dealAmountCents < tier.upperExclusiveCents) {
      return tier.bps;
    }
  }
  // Unreachable given the range assertion, but keeps the function total.
  throw new Error(`No platform fee tier for ${dealAmountCents} cents`);
}

/**
 * One single total platform fee for the whole deal, in USD cents.
 * *(Requirements 15.1–15.4)*
 */
export function platformFeeCents(dealAmountCents: bigint): bigint {
  const percentageFee = mulDivRoundHalfUp(
    dealAmountCents,
    selectPlatformFeeBps(dealAmountCents),
    BPS_DENOMINATOR,
  );
  return percentageFee < PLATFORM_FEE_MIN_CENTS ? PLATFORM_FEE_MIN_CENTS : percentageFee;
}

/** Settlement fee in USD cents (0.5% of the deal). *(Requirement 16.1)* */
export function settlementFeeCents(dealAmountCents: bigint): bigint {
  assertDealAmountInRange(dealAmountCents);
  return mulDivRoundHalfUp(dealAmountCents, SETTLEMENT_FEE_BPS, BPS_DENOMINATOR);
}

export interface PayoutInput {
  readonly dealAmountCents: bigint;
  readonly feePayer: FeePayer;
  /** Live network gas cost + buffer, no markup, in USD cents. *(Req 16.2, 16.3)* */
  readonly gasFeeCents: bigint;
  /**
   * Buyer's share of the platform fee for `split` deals, in basis points
   * (0–10,000). Ignored for buyer/seller payers. Defaults to a 50/50 split.
   */
  readonly splitBuyerBps?: bigint;
}

export interface FeeBreakdown {
  readonly dealAmountCents: bigint;
  readonly feePayer: FeePayer;
  /** Effective buyer share of the platform fee in bps (relevant for `split`). */
  readonly splitBuyerBps: bigint;
  readonly platformFeeCents: bigint;
  readonly buyerPlatformShareCents: bigint;
  readonly sellerPlatformShareCents: bigint;
  readonly settlementFeeCents: bigint;
  readonly gasFeeCents: bigint;
  readonly buyerSendsCents: bigint;
  readonly sellerReceivesCents: bigint;
  readonly platformKeepsCents: bigint;
  readonly networkTakesCents: bigint;
}

/**
 * Split the one total platform fee into the buyer's and seller's shares per
 * `fee_payer`. For `split` the buyer's share is `splitBuyerBps` of the total
 * (round-half-up) and the seller takes the exact remainder, so the two shares
 * always re-sum to the total and no cent is created or lost. The split ratio is
 * agreed per deal (default 50/50). *(Requirements 15.4, 15.5)*
 */
export function platformFeeShares(
  platformFee: bigint,
  feePayer: FeePayer,
  splitBuyerBps: bigint = DEFAULT_SPLIT_BUYER_BPS,
): { readonly buyer: bigint; readonly seller: bigint } {
  switch (feePayer) {
    case 'buyer':
      return { buyer: platformFee, seller: 0n };
    case 'seller':
      return { buyer: 0n, seller: platformFee };
    case 'split': {
      const bps = normalizeSplitBuyerBps(splitBuyerBps);
      const buyer = mulDivRoundHalfUp(platformFee, bps, BPS_DENOMINATOR);
      return { buyer, seller: platformFee - buyer };
    }
  }
}

/**
 * Compute the full canonical fee/payout breakdown from server-held values.
 * *(Requirements 16.4–16.6)*
 *
 * Invariant (fund conservation):
 *   buyerSends === sellerReceives + platformKeeps + networkTakes
 */
export function computeFeeBreakdown(input: PayoutInput): FeeBreakdown {
  assertDealAmountInRange(input.dealAmountCents);
  if (input.gasFeeCents < 0n) throw new Error('gasFeeCents must be non-negative');

  const platformFee = platformFeeCents(input.dealAmountCents);
  const splitBuyerBps = normalizeSplitBuyerBps(input.splitBuyerBps);
  const shares = platformFeeShares(platformFee, input.feePayer, splitBuyerBps);
  const settlementFee = settlementFeeCents(input.dealAmountCents);

  const buyerSends = input.dealAmountCents + shares.buyer;
  const sellerReceives = input.dealAmountCents - shares.seller - settlementFee - input.gasFeeCents;
  const platformKeeps = platformFee + settlementFee;

  return {
    dealAmountCents: input.dealAmountCents,
    feePayer: input.feePayer,
    splitBuyerBps: input.feePayer === 'split' ? splitBuyerBps : DEFAULT_SPLIT_BUYER_BPS,
    platformFeeCents: platformFee,
    buyerPlatformShareCents: shares.buyer,
    sellerPlatformShareCents: shares.seller,
    settlementFeeCents: settlementFee,
    gasFeeCents: input.gasFeeCents,
    buyerSendsCents: buyerSends,
    sellerReceivesCents: sellerReceives,
    platformKeepsCents: platformKeeps,
    networkTakesCents: input.gasFeeCents,
  };
}

export interface FeeLineItem {
  readonly key: string;
  readonly label: string;
  readonly amountCents: bigint;
}

/**
 * Canonical, ordered Fee_Calculator line items. The buyer view and seller view
 * render the identical list and values. *(Requirement 16.8)*
 */
export function buildLineItems(breakdown: FeeBreakdown): readonly FeeLineItem[] {
  return [
    { key: 'deal_amount', label: 'Deal amount', amountCents: breakdown.dealAmountCents },
    { key: 'platform_fee', label: 'Platform fee', amountCents: breakdown.platformFeeCents },
    {
      key: 'buyer_platform_share',
      label: 'Platform fee (buyer share)',
      amountCents: breakdown.buyerPlatformShareCents,
    },
    {
      key: 'seller_platform_share',
      label: 'Platform fee (seller share)',
      amountCents: breakdown.sellerPlatformShareCents,
    },
    {
      key: 'settlement_fee',
      label: 'Settlement fee (0.5%)',
      amountCents: breakdown.settlementFeeCents,
    },
    { key: 'gas_fee', label: 'Network gas fee', amountCents: breakdown.gasFeeCents },
    { key: 'buyer_sends', label: 'Buyer sends', amountCents: breakdown.buyerSendsCents },
    {
      key: 'seller_receives',
      label: 'Seller receives',
      amountCents: breakdown.sellerReceivesCents,
    },
    { key: 'platform_keeps', label: 'Platform keeps', amountCents: breakdown.platformKeepsCents },
  ];
}

/** Buyer-facing breakdown. Identical to the seller view. *(Requirement 16.8)* */
export function buyerView(breakdown: FeeBreakdown): readonly FeeLineItem[] {
  return buildLineItems(breakdown);
}

/** Seller-facing breakdown. Identical to the buyer view. *(Requirement 16.8)* */
export function sellerView(breakdown: FeeBreakdown): readonly FeeLineItem[] {
  return buildLineItems(breakdown);
}

/**
 * True when the seller's net payout is non-negative. `computeFeeBreakdown` is a
 * pure, total function (it computes a breakdown for any non-negative gas, even
 * absurd values), so this predicate is the explicit business-rule boundary:
 * callers that turn a breakdown into a REAL payout/settlement MUST reject a
 * breakdown that is not viable. (Re-audit FIX-6)
 */
export function isPayoutViable(breakdown: FeeBreakdown): boolean {
  return breakdown.sellerReceivesCents >= 0n;
}

/**
 * Throw when a breakdown would pay the seller a negative amount (fees + gas
 * exceed the deal amount). Call this at every point that executes a real
 * payout/settlement from a breakdown, never inside the pure engine.
 * (Re-audit FIX-6)
 */
export function assertPayoutViable(breakdown: FeeBreakdown): void {
  if (!isPayoutViable(breakdown)) {
    throw new Error(
      `Seller payout would be negative (${breakdown.sellerReceivesCents}): platform/settlement fees + gas exceed the deal amount`,
    );
  }
}
