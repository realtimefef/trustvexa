/**
 * Integer smallest-unit money primitives. *(Requirements 17.1, 17.2)*
 *
 * Every coin/token amount is stored and computed as an integer count of the
 * coin's smallest unit (`bigint`). No floating-point arithmetic is ever used
 * for money. USD figures used for fee tiering are integer cents (see
 * `fee-engine.ts`). Decimals mirror `money_precision_rules`
 * (packages/db/seeds/seed_reference_data.js); callers may also pass a
 * rules table loaded from the database.
 */
export interface PrecisionRule {
    readonly coin: string;
    readonly network: string;
    readonly decimals: number;
    readonly smallestUnitName?: string;
    readonly roundingMode?: string;
    readonly minTransferSmallestUnit?: bigint;
}
/**
 * Server-held precision table mirroring the seeded `money_precision_rules`
 * rows. Used when no database-loaded table is supplied. Never trust a
 * client-supplied decimals value for ledger math.
 */
export declare const DEFAULT_PRECISION_RULES: readonly PrecisionRule[];
export declare function precisionKey(coin: string, network: string): string;
/**
 * Resolve the precision rule for a coin/network. Throws when no rule exists so
 * that a missing rule can never silently fall back to a wrong precision.
 */
export declare function getPrecisionRule(coin: string, network: string, rules?: readonly PrecisionRule[]): PrecisionRule;
/**
 * Convert a canonical decimal amount string (e.g. "1.5") into an integer count
 * of smallest units. Rejects floating-point inputs and any amount whose
 * fractional precision exceeds the coin's decimals (which would lose money).
 */
export declare function toSmallestUnit(amount: string, decimals: number): bigint;
/**
 * Convert an integer count of smallest units back into a canonical decimal
 * string with no trailing zeros and no trailing dot. Round-trips exactly with
 * `toSmallestUnit`.
 */
export declare function fromSmallestUnit(units: bigint, decimals: number): string;
/** Whether a smallest-unit amount clears the rule's minimum transfer floor. */
export declare function meetsMinTransfer(units: bigint, rule: PrecisionRule): boolean;
//# sourceMappingURL=precision.d.ts.map