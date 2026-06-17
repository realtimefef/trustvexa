export interface FxQuote {
    coin: string;
    fiat: string;
    rate: number;
    source: string;
    sourceRank: number;
    fetchedAt: string;
}
export interface FxGuardConfig {
    maxAgeSeconds: number;
    tolerancePct: number;
    sanityFloor?: number;
    sanityCeil?: number;
}
export type FxRejectionReason = 'no_quotes' | 'stale' | 'out_of_band' | 'sanity_failed';
export interface FxSelection {
    ok: boolean;
    quote?: FxQuote;
    reason?: FxRejectionReason;
    deviationPct?: number;
}
export declare class FxUnavailableError extends Error {
    readonly reason: FxRejectionReason;
    constructor(reason: FxRejectionReason, message?: string);
}
export declare function ageSeconds(fetchedAt: string, nowIso: string): number;
export declare function isStale(quote: FxQuote, nowIso: string, maxAgeSeconds: number): boolean;
export declare function deviationPct(rate: number, reference: number): number;
/**
 * Choose the best usable quote: the lowest-rank (most primary) source that is
 * fresh, passes the sanity band, and — when a reference rate is supplied —
 * sits within the tolerance band. Returns a structured selection rather than
 * throwing so callers can decide to pause and refresh.
 */
export declare function selectRate(quotes: readonly FxQuote[], config: FxGuardConfig, nowIso: string, referenceRate?: number): FxSelection;
/** Throwing variant for the confirm path, where a usable rate is mandatory. */
export declare function requireRate(quotes: readonly FxQuote[], config: FxGuardConfig, nowIso: string, referenceRate?: number): FxQuote;
export interface PriceSanityCheckRecord {
    coin: string;
    fiat: string;
    rate: number;
    source: string;
    referenceRate: number | null;
    deviationPct: number | null;
    withinTolerance: boolean;
    stale: boolean;
    outcome: 'accepted' | FxRejectionReason;
}
export declare function buildPriceSanityCheck(selection: FxSelection, input: {
    coin: string;
    fiat: string;
    source: string;
    referenceRate?: number;
}): PriceSanityCheckRecord;
//# sourceMappingURL=fx.d.ts.map