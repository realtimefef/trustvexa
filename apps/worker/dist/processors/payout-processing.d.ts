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
export declare function processPayoutProcessing(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=payout-processing.d.ts.map