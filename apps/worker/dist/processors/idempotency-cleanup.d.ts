/**
 * Idempotency-key TTL cleanup processor.
 *
 * Purges expired rows from the `idempotency_keys` table. Without this,
 * the table grows without bound and eventually degrades write performance
 * on every money/state-changing endpoint. (Audit FIX-P2-3)
 *
 * This processor is registered as a recurring BullMQ job scheduled daily.
 * It deletes in batches to avoid long-running transactions that lock the table.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processIdempotencyCleanup(_job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=idempotency-cleanup.d.ts.map