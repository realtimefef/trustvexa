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
export declare const DEAL_MIN_USD_CENTS = 40000n;
export declare const DEAL_MAX_USD_CENTS = 5000000n;
/** Flat minimum platform fee: $30. *(Requirement 15.3)* */
export declare const PLATFORM_FEE_MIN_CENTS = 3000n;
/** Settlement fee: 0.5% of the deal, on every deal. *(Requirement 16.1)* */
export declare const SETTLEMENT_FEE_BPS = 50n;
/** Basis-point denominator (10,000 bps = 100%). */
export declare const BPS_DENOMINATOR = 10000n;
/**
 * Default buyer share of the platform fee when `fee_payer === 'split'`, in basis
 * points. 5,000 bps = 50%, i.e. an even split with the buyer absorbing the odd
 * cent (round-half-up). A per-deal `splitBuyerBps` overrides this so the split
 * is whatever the buyer and seller agree to (e.g. 70/30), never forced to 50/50.
 * *(Requirement 15.5)*
 */
export declare const DEFAULT_SPLIT_BUYER_BPS = 5000n;
/** Clamp an arbitrary split-share value into the valid [0, 10000] bps range. */
export declare function normalizeSplitBuyerBps(value: bigint | undefined): bigint;
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
export declare const PLATFORM_FEE_TIERS: readonly PlatformFeeTier[];
export declare function assertDealAmountInRange(dealAmountCents: bigint): void;
/** Multiply then divide with round-half-up, in exact integer (bigint) math. */
export declare function mulDivRoundHalfUp(amount: bigint, numerator: bigint, denominator: bigint): bigint;
/** Select the applicable tier bps for a deal amount (boundary → lower rate). */
export declare function selectPlatformFeeBps(dealAmountCents: bigint): bigint;
/**
 * One single total platform fee for the whole deal, in USD cents.
 * *(Requirements 15.1–15.4)*
 */
export declare function platformFeeCents(dealAmountCents: bigint): bigint;
/** Settlement fee in USD cents (0.5% of the deal). *(Requirement 16.1)* */
export declare function settlementFeeCents(dealAmountCents: bigint): bigint;
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
export declare function platformFeeShares(platformFee: bigint, feePayer: FeePayer, splitBuyerBps?: bigint): {
    readonly buyer: bigint;
    readonly seller: bigint;
};
/**
 * Compute the full canonical fee/payout breakdown from server-held values.
 * *(Requirements 16.4–16.6)*
 *
 * Invariant (fund conservation):
 *   buyerSends === sellerReceives + platformKeeps + networkTakes
 */
export declare function computeFeeBreakdown(input: PayoutInput): FeeBreakdown;
export interface FeeLineItem {
    readonly key: string;
    readonly label: string;
    readonly amountCents: bigint;
}
/**
 * Canonical, ordered Fee_Calculator line items. The buyer view and seller view
 * render the identical list and values. *(Requirement 16.8)*
 */
export declare function buildLineItems(breakdown: FeeBreakdown): readonly FeeLineItem[];
/** Buyer-facing breakdown. Identical to the seller view. *(Requirement 16.8)* */
export declare function buyerView(breakdown: FeeBreakdown): readonly FeeLineItem[];
/** Seller-facing breakdown. Identical to the buyer view. *(Requirement 16.8)* */
export declare function sellerView(breakdown: FeeBreakdown): readonly FeeLineItem[];
/**
 * True when the seller's net payout is non-negative. `computeFeeBreakdown` is a
 * pure, total function (it computes a breakdown for any non-negative gas, even
 * absurd values), so this predicate is the explicit business-rule boundary:
 * callers that turn a breakdown into a REAL payout/settlement MUST reject a
 * breakdown that is not viable. (Re-audit FIX-6)
 */
export declare function isPayoutViable(breakdown: FeeBreakdown): boolean;
/**
 * Throw when a breakdown would pay the seller a negative amount (fees + gas
 * exceed the deal amount). Call this at every point that executes a real
 * payout/settlement from a breakdown, never inside the pure engine.
 * (Re-audit FIX-6)
 */
export declare function assertPayoutViable(breakdown: FeeBreakdown): void;
//# sourceMappingURL=fee-engine.d.ts.map