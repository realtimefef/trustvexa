/**
 * Dead-letter queue processor + failure recorder.
 *
 * `processDeadLetter` handles explicit dead-letter control jobs (operator- or
 * scheduler-driven status transitions such as retry/resolve), guarded by the
 * domain's legal-transition rules.
 *
 * `recordJobFailure` is invoked by the worker bootstrap when any other queue
 * exhausts its retry attempts. It envelope-encrypts the original job payload
 * (so PII/secrets in a failed job are never stored in plaintext) and records a
 * dead-letter row with the domain-computed next status. Encryption uses the key
 * provider seam; if the KEK is not configured the payload is recorded empty
 * rather than dropping the failure record entirely.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processDeadLetter(job: Job, ctx: ProcessorContext): Promise<void>;
/**
 * Record a permanently-failed job onto the dead-letter store. Called once a
 * queue's BullMQ retry budget is exhausted.
 */
export declare function recordJobFailure(ctx: ProcessorContext, queueName: string, job: Job, err: Error): Promise<void>;
//# sourceMappingURL=dead-letter.d.ts.map