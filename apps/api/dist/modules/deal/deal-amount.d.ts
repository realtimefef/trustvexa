/**
 * Deal-amount bounds (Plan §18.10–18.11) — Property 11.
 *
 * Bounds are USD, held as integer cents (server-authoritative, never floats).
 * $400.00 = 40_000 cents; $50,000.00 = 5_000_000 cents. Inclusive on both ends.
 * (Requirements 18.10, 18.11)
 */
export declare const MIN_DEAL_AMOUNT_CENTS = 40000;
export declare const MAX_DEAL_AMOUNT_CENTS = 5000000;
export declare function isDealAmountWithinBounds(amountCents: number): boolean;
export declare class DealAmountOutOfBoundsError extends Error {
    readonly amountCents: number;
    constructor(amountCents: number);
}
export declare function assertDealAmountWithinBounds(amountCents: number): void;
//# sourceMappingURL=deal-amount.d.ts.map