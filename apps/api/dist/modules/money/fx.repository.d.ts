/**
 * FX persistence (task 5.15, DB-bound).
 *
 * Reads recent quotes from `fx_price_snapshots` and records the sanity/tolerance
 * outcome in `price_sanity_checks`. Rate selection logic lives in `fx.ts`; this
 * module only does parameterized SQL. `numeric` rates are read as text and
 * parsed once by the caller to avoid float drift.
 */
import type { FxQuote, PriceSanityCheckRecord } from './fx.js';
export interface FxTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
/** Load the most recent quotes for a coin/fiat pair, freshest and best-ranked first. */
export declare function loadRecentQuotes(client: FxTxClient, coin: string, fiat: string, limit?: number): Promise<FxQuote[]>;
/** Persist the outcome of a price sanity/tolerance check for audit. */
export declare function recordSanityCheck(client: FxTxClient, record: PriceSanityCheckRecord): Promise<void>;
//# sourceMappingURL=fx.repository.d.ts.map