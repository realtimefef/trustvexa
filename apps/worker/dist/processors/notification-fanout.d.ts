/**
 * Notification fan-out processor.
 *
 * For each recipient it persists an in-app notification (respecting their
 * per-event channel preference) inside one transaction, then builds the
 * canonical realtime envelope and pushes to every active web-push
 * subscription. Web-push delivery uses the push seam (VAPID keys are
 * operator-provisioned); a single failing endpoint is logged and skipped so one
 * stale subscription cannot fail the whole fan-out.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
export declare function processNotificationFanout(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=notification-fanout.d.ts.map