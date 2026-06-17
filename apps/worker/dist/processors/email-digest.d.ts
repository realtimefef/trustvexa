/**
 * Email digest processor.
 *
 * Runs on a daily (08:00 UTC) and weekly (Monday 08:00 UTC) cron schedule.
 * For each trigger it:
 *  1. Queries users whose `email_digest_frequency` preference matches the
 *     current run type (daily or weekly).
 *  2. Collects their unread notifications from the appropriate time window.
 *  3. Renders a batched digest email via the `getDigestEmail` template.
 *  4. Enqueues one `email` job per user via BullMQ.
 *
 * The `immediate` send path in the notification-fanout processor is unchanged.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
/** Job names used by the cron scheduler. */
export declare const DAILY_DIGEST_JOB: "daily-digest";
export declare const WEEKLY_DIGEST_JOB: "weekly-digest";
export declare function processEmailDigest(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=email-digest.d.ts.map