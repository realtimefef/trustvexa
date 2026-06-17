import { fx, fxRepo } from '@trustvexa/api/worker-jobs';
import { parseFxRefreshJob } from '../payloads.js';
function guardConfig() {
    return {
        maxAgeSeconds: Number.parseInt(process.env.FX_MAX_AGE_SECONDS ?? '120', 10),
        tolerancePct: Number.parseFloat(process.env.FX_TOLERANCE_PCT ?? '2'),
    };
}
export async function processFxRefresh(job, ctx) {
    const data = parseFxRefreshJob(job.data);
    const fetched = await ctx.adapters.fx.fetchQuotes(data.coin, data.fiat);
    const nowIso = new Date().toISOString();
    const quotes = fetched.map((q) => ({
        coin: q.coin,
        fiat: q.fiat,
        rate: q.rate,
        source: q.source,
        sourceRank: q.sourceRank,
        fetchedAt: q.fetchedAt,
    }));
    const selection = fx.selectRate(quotes, guardConfig(), nowIso, data.referenceRate);
    const record = fx.buildPriceSanityCheck(selection, {
        coin: data.coin,
        fiat: data.fiat,
        source: quotes[0]?.source ?? 'unknown',
        ...(data.referenceRate !== undefined ? { referenceRate: data.referenceRate } : {}),
    });
    await fxRepo.recordSanityCheck(ctx.db, record);
    ctx.logger.info({
        coin: data.coin,
        fiat: data.fiat,
        ok: selection.ok,
        reason: selection.reason ?? null,
        rate: selection.quote?.rate ?? null,
        quotes: quotes.length,
    }, 'fx sanity check recorded');
}
//# sourceMappingURL=fx-refresh.js.map