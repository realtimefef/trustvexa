/**
 * Payout processing processor.
 *
 * Two-signature authorization (preflight) is enforced in the API request path
 * before a payout is enqueued, so the worker only carries an already-authorized
 * payout through its on-chain lifecycle:
 *   - `broadcast`: submit the signed transaction via the chain seam, then
 *     record the resulting tx hash and advance the payout to `broadcast`.
 *   - `confirm`: advance a broadcast payout to `confirmed` once the chain
 *     reports the required confirmations.
 *
 * CRIT-4 FIX — Broadcast idempotency guard:
 *   Before calling chain.broadcast(), we check whether a previous job attempt
 *   already sent the transaction (tx_hash IS NOT NULL). If so, we skip the
 *   broadcast and just reconcile the DB — preventing a double-send on worker
 *   retry after a crash between the RPC call and the DB write.
 *
 *   BullMQ's Redis-based job locking prevents two workers from processing the
 *   same job simultaneously, so the only double-broadcast scenario is a
 *   previous attempt that succeeded on-chain but failed the DB update.
 *   The tx_hash check closes that exact window.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { payoutRepo } from '@trustvexa/api/worker-jobs';
import { parsePayoutProcessingJob } from '../payloads.js';

export async function processPayoutProcessing(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = parsePayoutProcessingJob(job.data);

  if (data.action === 'broadcast') {
    // Last-line mainnet guard — refuses to broadcast if the operator hasn't
    // completed the go-live checklist.
    if (process.env.MAINNET_ENABLED !== 'true') {
      ctx.logger.error(
        { payout_id: data.payoutId },
        'payout broadcast blocked: MAINNET_ENABLED is not "true"',
      );
      throw new Error('mainnet_not_enabled: refusing to broadcast payout while mainnet is disabled');
    }

    // ── CRIT-4 FIX: Idempotency check before on-chain broadcast ─────────────
    // If a previous job attempt already broadcast this payout (succeeded on-chain
    // but crashed before updating the DB), tx_hash will already be set. Skip the
    // broadcast so we never send the same funds twice.
    const existingRow = await ctx.db.query<{ tx_hash: string | null; status: string }>(
      `SELECT tx_hash, status FROM payout_queue WHERE id = $1 LIMIT 1`,
      [data.payoutId],
    );
    const existingTxHash = existingRow.rows[0]?.tx_hash ?? null;

    let txHashToRecord: string;

    if (existingTxHash !== null) {
      // Previous attempt already broadcast successfully — reconcile the DB version
      // and trigger the webhook without hitting the chain again.
      ctx.logger.warn(
        { payout_id: data.payoutId, tx_hash: existingTxHash },
        'payout broadcast: tx_hash already set from a previous attempt — skipping duplicate broadcast (recovery mode)',
      );
      txHashToRecord = existingTxHash;
    } else {
      // tx_hash is null — safe to broadcast on-chain for the first time.
      const result = await ctx.adapters.chain.broadcast({
        coin: data.coin,
        network: data.network,
        toAddress: data.toAddress,
        amountSmallestUnit: data.amountSmallestUnit,
      });
      txHashToRecord = result.txHash;
    }

    const version = await payoutRepo.updatePayoutStatus(
      ctx.db,
      data.payoutId,
      data.expectedVersion,
      'broadcast',
      txHashToRecord,
    );
    if (version === null) {
      ctx.logger.warn(
        { payout_id: data.payoutId, expected_version: data.expectedVersion },
        'payout broadcast: optimistic version conflict, skipping — another writer already advanced this payout',
      );
      return;
    }
    ctx.logger.info(
      { payout_id: data.payoutId, tx_hash: txHashToRecord, version },
      'payout broadcast recorded',
    );

    try {
      const payeeRes = await ctx.db.query<{
        payee_id: string;
        amount_coin: string;
        coin: string;
        network: string;
        address: string;
      }>(
        `SELECT payee_id, amount_coin::text AS amount_coin, coin, network, address FROM payout_queue WHERE id = $1`,
        [data.payoutId],
      );
      const payoutRow = payeeRes.rows[0];
      if (payoutRow) {
        const { triggerWebhook } = await import('@trustvexa/api/worker-jobs');
        await triggerWebhook(payoutRow.payee_id, 'payout.broadcast', {
          payout_id: data.payoutId,
          coin: payoutRow.coin,
          network: payoutRow.network,
          address: payoutRow.address,
          amount: payoutRow.amount_coin,
          tx_hash: txHashToRecord,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ctx.logger.error(
        { err: msg, payout_id: data.payoutId },
        'Failed to trigger payout.broadcast webhook',
      );
    }

    return;
  }

  // action === 'confirm'
  const version = await payoutRepo.updatePayoutStatus(
    ctx.db,
    data.payoutId,
    data.expectedVersion,
    'confirmed',
    data.txHash ?? null,
  );
  if (version === null) {
    ctx.logger.warn(
      { payout_id: data.payoutId, expected_version: data.expectedVersion },
      'payout confirm: optimistic version conflict, skipping',
    );
    return;
  }
  ctx.logger.info({ payout_id: data.payoutId, version }, 'payout confirmed');
}
