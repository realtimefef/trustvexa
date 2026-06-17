/**
 * FX refresh processor.
 *
 * Pulls fresh quotes from the FX provider seam, runs them through the domain's
 * pure rate-selection guard (staleness + tolerance + sanity band), and records
 * the resulting price-sanity outcome. The provider is operator-provisioned, so
 * until credentials exist the seam throws and the job dead-letters instead of
 * locking in an unvalidated rate.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { fx, fxRepo } from '@trustvexa/api/worker-jobs';
import { parseFxRefreshJob } from '../payloads.js';

function guardConfig(): fx.FxGuardConfig {
  return {
    maxAgeSeconds: Number.parseInt(process.env.FX_MAX_AGE_SECONDS ?? '120', 10),
    tolerancePct: Number.parseFloat(process.env.FX_TOLERANCE_PCT ?? '2'),
  };
}

export async function processFxRefresh(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = parseFxRefreshJob(job.data);
  const fetched = await ctx.adapters.fx.fetchQuotes(data.coin, data.fiat);
  const nowIso = new Date().toISOString();

  const quotes: fx.FxQuote[] = fetched.map((q) => ({
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

  ctx.logger.info(
    {
      coin: data.coin,
      fiat: data.fiat,
      ok: selection.ok,
      reason: selection.reason ?? null,
      rate: selection.quote?.rate ?? null,
      quotes: quotes.length,
    },
    'fx sanity check recorded',
  );
}
