/**
 * Job processor registry.
 *
 * Maps each processable queue name to its handler. The worker bootstrap looks a
 * processor up here (the SLA-timer queue is handled separately, since it runs
 * the lifecycle sweep engine) and invokes it with a shared
 * {@link ProcessorContext}.
 */
import type { Job } from 'bullmq';
import type { Logger } from '@trustvexa/shared/logger';
import type { DbClient, WithTransaction } from '../db.js';
import type { Adapters } from '../adapters.js';
import { processEmail } from './email.js';
import { processNotificationFanout } from './notification-fanout.js';
import { processPayoutProcessing } from './payout-processing.js';
import { processMediaScan } from './media-scan.js';
import { processFxRefresh } from './fx-refresh.js';
import { processReconciliation } from './reconciliation.js';
import { processDeadLetter } from './dead-letter.js';
import { processWebhookDelivery } from './webhook-delivery.js';
import { processDbBackup } from './db-backup.js';
import { processEmailDigest } from './email-digest.js';
import { processIdempotencyCleanup } from './idempotency-cleanup.js';

/** Dependencies shared by every job processor. */
export interface ProcessorContext {
  readonly logger: Logger;
  readonly db: DbClient;
  readonly withTransaction: WithTransaction;
  readonly adapters: Adapters;
}

export type JobProcessor = (job: Job, ctx: ProcessorContext) => Promise<void>;

/** Queue names backed by a dedicated processor (sla-timers is handled separately). */
export type ProcessableQueue =
  | 'email'
  | 'notification-fanout'
  | 'payout-processing'
  | 'media-scan'
  | 'fx-refresh'
  | 'reconciliation'
  | 'dead-letter'
  | 'webhook-delivery'
  | 'db-backup'
  | 'email-digest'
  | 'idempotency-cleanup';

export const PROCESSOR_REGISTRY: Readonly<Record<ProcessableQueue, JobProcessor>> = {
  email: processEmail,
  'notification-fanout': processNotificationFanout,
  'payout-processing': processPayoutProcessing,
  'media-scan': processMediaScan,
  'fx-refresh': processFxRefresh,
  reconciliation: processReconciliation,
  'dead-letter': processDeadLetter,
  'webhook-delivery': processWebhookDelivery,
  'db-backup': processDbBackup,
  'email-digest': processEmailDigest,
  'idempotency-cleanup': processIdempotencyCleanup,
};
