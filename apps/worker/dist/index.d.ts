/**
 * TrustVexa worker service entrypoint.
 *
 * A separate Render service that runs blockchain watchers, BullMQ jobs, and SLA
 * timers so long-running and money-signing work never blocks request handling.
 * *(Requirements 43.3, 43.5, 45.8)*
 *
 * Scaffold scope (task 1.4): bootstrap the BullMQ queue/worker wiring and run a
 * health/heartbeat loop that logs liveness. The actual job processors (email,
 * notification fan-out, SLA timers, payouts, media scan, FX refresh,
 * reconciliation, dead-letter) are implemented in later tasks — here each queue
 * is only registered with a placeholder processor.
 */
import { Queue, Worker } from 'bullmq';
import type { Server } from 'node:http';
/**
 * The full set of BullMQ queues from the design (Background Jobs on Redis).
 * *(Requirements 14, 22, 29, 36, 45)*
 */
declare const QUEUE_NAMES: readonly ["email", "notification-fanout", "sla-timers", "payout-processing", "media-scan", "fx-refresh", "reconciliation", "dead-letter", "deposit-watch", "webhook-delivery", "db-backup", "email-digest", "idempotency-cleanup"];
type QueueName = (typeof QUEUE_NAMES)[number];
/** Handles created during bootstrap so they can be torn down on shutdown. */
interface WorkerRuntime {
    queues: Map<QueueName, Queue>;
    workers: Worker[];
    heartbeat: NodeJS.Timeout;
    healthServer: Server;
}
/** Worker service entrypoint. */
export declare function main(): WorkerRuntime;
export {};
//# sourceMappingURL=index.d.ts.map