// FX rate selection, sanity/tolerance guards, and stale detection (task 5.15).
// Pure logic only; reading fx_price_snapshots and writing price_sanity_checks
// live in fx.repository.ts. The rate is chosen from a primary source with
// backups, validated against a sanity band and a tolerance band, and locked at
// confirm time. (Requirements 17.10, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6)
export class FxUnavailableError extends Error {
    reason;
    constructor(reason, message) {
        super(message ?? `fx_unavailable:${reason}`);
        this.name = 'FxUnavailableError';
        this.reason = reason;
    }
}
export function ageSeconds(fetchedAt, nowIso) {
    const fetched = Date.parse(fetchedAt);
    const now = Date.parse(nowIso);
    return (now - fetched) / 1000;
}
export function isStale(quote, nowIso, maxAgeSeconds) {
    return ageSeconds(quote.fetchedAt, nowIso) > maxAgeSeconds;
}
function passesSanity(rate, config) {
    if (!(rate > 0) || !Number.isFinite(rate))
        return false;
    if (config.sanityFloor !== undefined && rate < config.sanityFloor)
        return false;
    if (config.sanityCeil !== undefined && rate > config.sanityCeil)
        return false;
    return true;
}
export function deviationPct(rate, reference) {
    if (reference === 0)
        return Number.POSITIVE_INFINITY;
    return (Math.abs(rate - reference) / reference) * 100;
}
/**
 * Choose the best usable quote: the lowest-rank (most primary) source that is
 * fresh, passes the sanity band, and — when a reference rate is supplied —
 * sits within the tolerance band. Returns a structured selection rather than
 * throwing so callers can decide to pause and refresh.
 */
export function selectRate(quotes, config, nowIso, referenceRate) {
    if (quotes.length === 0)
        return { ok: false, reason: 'no_quotes' };
    const byRank = [...quotes].sort((a, b) => a.sourceRank - b.sourceRank);
    let sawFresh = false;
    let sawSane = false;
    for (const quote of byRank) {
        if (isStale(quote, nowIso, config.maxAgeSeconds))
            continue;
        sawFresh = true;
        if (!passesSanity(quote.rate, config))
            continue;
        sawSane = true;
        if (referenceRate !== undefined) {
            const dev = deviationPct(quote.rate, referenceRate);
            if (dev > config.tolerancePct)
                continue;
            return { ok: true, quote, deviationPct: dev };
        }
        return { ok: true, quote };
    }
    if (!sawFresh)
        return { ok: false, reason: 'stale' };
    if (!sawSane)
        return { ok: false, reason: 'sanity_failed' };
    return { ok: false, reason: 'out_of_band' };
}
/** Throwing variant for the confirm path, where a usable rate is mandatory. */
export function requireRate(quotes, config, nowIso, referenceRate) {
    const selection = selectRate(quotes, config, nowIso, referenceRate);
    if (!selection.ok || !selection.quote) {
        throw new FxUnavailableError(selection.reason ?? 'no_quotes');
    }
    return selection.quote;
}
export function buildPriceSanityCheck(selection, input) {
    const rate = selection.quote?.rate ?? 0;
    const dev = selection.deviationPct ?? null;
    return {
        coin: input.coin,
        fiat: input.fiat,
        rate,
        source: selection.quote?.source ?? input.source,
        referenceRate: input.referenceRate ?? null,
        deviationPct: dev,
        withinTolerance: selection.ok,
        stale: selection.reason === 'stale',
        outcome: selection.ok ? 'accepted' : (selection.reason ?? 'no_quotes'),
    };
}
//# sourceMappingURL=fx.js.map