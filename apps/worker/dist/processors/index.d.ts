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
/** Dependencies shared by every job processor. */
export interface ProcessorContext {
    readonly logger: Logger;
    readonly db: DbClient;
    readonly withTransaction: WithTransaction;
    readonly adapters: Adapters;
}
export type JobProcessor = (job: Job, ctx: ProcessorContext) => Promise<void>;
/** Queue names backed by a dedicated processor (sla-timers is handled separately). */
export type ProcessableQueue = 'email' | 'notification-fanout' | 'payout-processing' | 'media-scan' | 'fx-refresh' | 'reconciliation' | 'dead-letter' | 'webhook-delivery' | 'db-backup' | 'email-digest' | 'idempotency-cleanup';
export declare const PROCESSOR_REGISTRY: Readonly<Record<ProcessableQueue, JobProcessor>>;
//# sourceMappingURL=index.d.ts.map