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
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

interface FxQuoteRow {
  coin: string;
  fiat: string;
  rate: string;
  source: string;
  source_rank: number;
  is_stale: boolean;
  fetched_at: string;
}

/** Load the most recent quotes for a coin/fiat pair, freshest and best-ranked first. */
export async function loadRecentQuotes(
  client: FxTxClient,
  coin: string,
  fiat: string,
  limit = 10,
): Promise<FxQuote[]> {
  const { rows } = await client.query<FxQuoteRow>(
    `SELECT coin, fiat, rate, source, source_rank, is_stale, fetched_at
			 FROM fx_price_snapshots
			WHERE coin = $1 AND fiat = $2
			ORDER BY fetched_at DESC, source_rank ASC
			LIMIT $3`,
    [coin, fiat, limit],
  );
  return rows.map((r) => ({
    coin: r.coin,
    fiat: r.fiat,
    rate: Number(r.rate),
    source: r.source,
    sourceRank: r.source_rank,
    fetchedAt: r.fetched_at,
  }));
}

/** Persist the outcome of a price sanity/tolerance check for audit. */
export async function recordSanityCheck(
  client: FxTxClient,
  record: PriceSanityCheckRecord,
): Promise<void> {
  await client.query(
    `INSERT INTO price_sanity_checks
				(coin, fiat, observed_rate, expected_rate, deviation_pct, within_band, action, checked_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      record.coin,
      record.fiat,
      record.rate,
      record.referenceRate,
      record.deviationPct,
      record.withinTolerance,
      record.outcome,
    ],
  );
}
