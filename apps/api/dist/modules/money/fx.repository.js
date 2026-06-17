/** Load the most recent quotes for a coin/fiat pair, freshest and best-ranked first. */
export async function loadRecentQuotes(client, coin, fiat, limit = 10) {
    const { rows } = await client.query(`SELECT coin, fiat, rate, source, source_rank, is_stale, fetched_at
			 FROM fx_price_snapshots
			WHERE coin = $1 AND fiat = $2
			ORDER BY fetched_at DESC, source_rank ASC
			LIMIT $3`, [coin, fiat, limit]);
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
export async function recordSanityCheck(client, record) {
    await client.query(`INSERT INTO price_sanity_checks
				(coin, fiat, observed_rate, expected_rate, deviation_pct, within_band, action, checked_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`, [
        record.coin,
        record.fiat,
        record.rate,
        record.referenceRate,
        record.deviationPct,
        record.withinTolerance,
        record.outcome,
    ]);
}
//# sourceMappingURL=fx.repository.js.map