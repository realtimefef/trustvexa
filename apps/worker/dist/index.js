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
import { fileURLToPath } from 'node:url';
import { createRedisConnection, closeRedis } from '@trustvexa/shared/redis';
import { closePool } from '@trustvexa/shared/db';
import { createLogger } from '@trustvexa/shared/logger';
import { runLifecycleTimers } from '@trustvexa/api/deal-lifecycle';
import { assertRuntimeConfig } from '@trustvexa/api/worker-jobs';
import { startHealthServer } from './health.js';
import { db, withTransaction } from './db.js';
import { createDefaultAdapters } from './adapters.js';
import { PROCESSOR_REGISTRY, } from './processors/index.js';
import { processDepositWatch } from './processors/deposit-watch.js';
// WORKER-CRIT-1 FIX: Import recordJobFailure so permanently-failed jobs are
// written to the dead-letter store instead of only being logged.
import { recordJobFailure } from './processors/dead-letter.js';
/** Shared structured logger for the worker service (Requirement 44.4). */
const logger = createLogger({ service: '@trustvexa/worker' });
/**
 * The full set of BullMQ queues from the design (Background Jobs on Redis).
 * *(Requirements 14, 22, 29, 36, 45)*
 */
const QUEUE_NAMES = [
    'email',
    'notification-fanout',
    'sla-timers',
    'payout-processing',
    'media-scan',
    'fx-refresh',
    'reconciliation',
    'dead-letter',
    'deposit-watch',
    'webhook-delivery',
    'db-backup',
    'email-digest',
    'idempotency-cleanup',
];
const HEARTBEAT_INTERVAL_MS = Number.parseInt(process.env.WORKER_HEARTBEAT_MS ?? '30000', 10);
/** SLA-timer sweep cadence (Requirement 14); BullMQ repeatable interval, ms. */
const SLA_SWEEP_INTERVAL_MS = Number.parseInt(process.env.SLA_SWEEP_INTERVAL_MS ?? '60000', 10);
const SLA_TIMERS_QUEUE = 'sla-timers';
const LIFECYCLE_SWEEP_JOB = 'lifecycle-sweep';
/**
 * Deposit-watch sweep cadence (per-chain deposit monitoring). BullMQ repeatable
 * interval in ms; each sweep loads pending escrow addresses and queries them on
 * their chain through the ChainClient adapter seam.
 */
const DEPOSIT_WATCH_INTERVAL_MS = Number.parseInt(process.env.DEPOSIT_WATCH_INTERVAL_MS ?? '30000', 10);
const DEPOSIT_WATCH_QUEUE = 'deposit-watch';
const DEPOSIT_WATCH_JOB = 'deposit-sweep';
/**
 * Shared processor dependencies (logger, pooled DB client, transaction helper,
 * external adapter seams). Built lazily on first use so importing this module
 * never opens a connection.
 */
let processorContext = null;
function getProcessorContext() {
    if (processorContext === null) {
        processorContext = {
            logger,
            db,
            withTransaction,
            adapters: createDefaultAdapters(),
        };
    }
    return processorContext;
}
/**
 * Tracks the last heartbeat so the `/healthz` endpoint can report liveness. A
 * heartbeat is considered alive if it beat within twice its interval.
 */
const heartbeatState = { lastBeatAtMs: null };
/** Snapshot the current heartbeat liveness for the health endpoint. */
function getHeartbeatLiveness() {
    const last = heartbeatState.lastBeatAtMs;
    if (last === null) {
        return { alive: false, lastBeatAt: null };
    }
    const alive = Date.now() - last < HEARTBEAT_INTERVAL_MS * 2;
    return { alive, lastBeatAt: new Date(last).toISOString() };
}
/**
 * Placeholder processor. Real per-queue job logic is implemented in later tasks;
 * for now jobs are acknowledged without side effects so the wiring is verifiable.
 */
async function placeholderProcessor(job) {
    logger.info({ queue: job.queueName, job_id: job.id, job_name: job.name }, 'received job (scaffold no-op)');
}
/**
 * SLA-timer processor (task 4.13, Requirement 14). On each scheduled sweep it
 * runs the lifecycle-timer engine — funding-window expiry, completion-clock
 * expiry plus trust penalty, and inspection-window auto-release — all routed
 * through the deal service so they obey the same allow-list, optimistic
 * locking, and hash-chained audit. Non-sweep jobs fall through to the no-op.
 */
async function slaTimerProcessor(job) {
    if (job.name !== LIFECYCLE_SWEEP_JOB) {
        await placeholderProcessor(job);
        return;
    }
    const summary = await runLifecycleTimers({ now: new Date() });
    logger.info({ queue: job.queueName, job_id: job.id, ...summary }, 'lifecycle timer sweep complete');
}
/**
 * Select the processor for a queue:
 *   - `sla-timers`    → the lifecycle-timer sweep engine,
 *   - `deposit-watch` → the per-chain deposit watcher,
 *   - any registry queue (email, notifications, payouts, media-scan, fx-refresh,
 *     reconciliation, dead-letter) → its real handler, given a shared context,
 *   - anything else   → the no-op placeholder.
 */
function processorFor(name) {
    if (name === SLA_TIMERS_QUEUE)
        return slaTimerProcessor;
    if (name === DEPOSIT_WATCH_QUEUE) {
        return (job) => processDepositWatch(job, getProcessorContext());
    }
    if (name === 'reconciliation') {
        return async (job) => {
            if (job.name === 'backup-restore-test') {
                const { runBackupRestoreTest } = await import('./processors/backup-restore-test.js');
                await runBackupRestoreTest(getProcessorContext());
                return;
            }
            const handler = PROCESSOR_REGISTRY[name];
            await handler(job, getProcessorContext());
        };
    }
    const handler = PROCESSOR_REGISTRY[name];
    if (handler) {
        return (job) => handler(job, getProcessorContext());
    }
    return placeholderProcessor;
}
/** Compile-time guard: every ProcessableQueue is also a registered QueueName. */
const _registryQueuesAreKnown = Object.keys(PROCESSOR_REGISTRY);
void _registryQueuesAreKnown;
/**
 * Bootstrap BullMQ queues and workers. Each queue/worker gets its own Redis
 * connection (BullMQ requirement). Connections are created here at runtime, not
 * at import time, so building/testing the module never opens a socket.
 */
function bootstrapQueues() {
    const queues = new Map();
    const workers = [];
    for (const name of QUEUE_NAMES) {
        const queue = new Queue(name, { connection: createRedisConnection() });
        queues.set(name, queue);
        const worker = new Worker(name, processorFor(name), {
            connection: createRedisConnection(),
            autorun: true,
        });
        // WORKER-CRIT-1 FIX: Record permanently-failed jobs to the dead-letter store
        // (encrypted payload, failure reason, retry count) so the operator can triage
        // and replay them from the admin console. Previously this only logged.
        worker.on('failed', (job, err) => {
            logger.error({ queue: name, job_id: job?.id ?? 'unknown', err: err.message }, 'job failed');
            if (job) {
                void recordJobFailure(getProcessorContext(), name, job, err).catch((dlErr) => {
                    logger.error({ queue: name, job_id: job.id ?? 'unknown', err: dlErr instanceof Error ? dlErr.message : String(dlErr) }, 'failed to write dead-letter record');
                });
            }
        });
        workers.push(worker);
    }
    return { queues, workers };
}
/**
 * Register the repeatable SLA-timer sweep on the sla-timers queue (task 4.13).
 * BullMQ dedupes repeatable jobs by key, so re-registering on each boot is safe.
 */
async function scheduleLifecycleSweep(queues) {
    const queue = queues.get(SLA_TIMERS_QUEUE);
    if (queue === undefined)
        return;
    await queue.add(LIFECYCLE_SWEEP_JOB, {}, {
        repeat: { every: SLA_SWEEP_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Register the repeatable deposit-watch sweep (per-chain deposit monitoring).
 * Each sweep loads pending escrow addresses and checks them on-chain via the
 * ChainClient adapters; chains without configured RPC are skipped, so manual
 * tx-hash verification remains the guaranteed funding fallback.
 */
async function scheduleDepositWatchSweep(queues) {
    const queue = queues.get(DEPOSIT_WATCH_QUEUE);
    if (queue === undefined)
        return;
    await queue.add(DEPOSIT_WATCH_JOB, {}, {
        repeat: { every: DEPOSIT_WATCH_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Register the repeatable backup-restore test on the reconciliation queue (task 9.2).
 * Runs weekly on Sunday at 3am UTC.
 */
async function scheduleBackupRestoreTest(queues) {
    const queue = queues.get('reconciliation');
    if (queue === undefined)
        return;
    await queue.add('backup-restore-test', {}, {
        repeat: { pattern: '0 3 * * 0' },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Register the repeatable DB backup on the db-backup queue.
 * Runs daily at 1am UTC.
 */
async function scheduleDbBackup(queues) {
    const queue = queues.get('db-backup');
    if (queue === undefined)
        return;
    await queue.add('db-backup-job', {}, {
        repeat: { pattern: '0 1 * * *' },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Register the daily idempotency-key TTL cleanup.
 * Purges expired rows from `idempotency_keys` every day at 02:30 UTC.
 * (Audit FIX-P2-3)
 */
async function scheduleIdempotencyCleanup(queues) {
    const queue = queues.get('idempotency-cleanup');
    if (queue === undefined)
        return;
    await queue.add('idempotency-cleanup-job', {}, {
        repeat: { pattern: '30 2 * * *' },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Register the repeatable email-digest cron jobs.
 * Daily digest runs at 08:00 UTC every day.
 * Weekly digest runs at 08:00 UTC every Monday.
 */
async function scheduleEmailDigest(queues) {
    const queue = queues.get('email-digest');
    if (queue === undefined)
        return;
    // Daily digest at 08:00 UTC
    await queue.add('daily-digest', {}, {
        repeat: { pattern: '0 8 * * *' },
        removeOnComplete: true,
        removeOnFail: 100,
    });
    // Weekly digest at 08:00 UTC on Monday
    await queue.add('weekly-digest', {}, {
        repeat: { pattern: '0 8 * * 1' },
        removeOnComplete: true,
        removeOnFail: 100,
    });
}
/**
 * Start a heartbeat loop that records liveness on a fixed interval. The
 * recorded timestamp backs the `/healthz` heartbeat-liveness signal.
 */
function startHeartbeat() {
    const beat = () => {
        heartbeatState.lastBeatAtMs = Date.now();
        logger.debug({ queues: QUEUE_NAMES.length }, 'worker heartbeat alive');
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    // Do not keep the event loop alive solely for the heartbeat.
    timer.unref();
    return timer;
}
/** Gracefully tear down workers, queues, the heartbeat, health server, and shared connections. */
async function shutdown(runtime) {
    clearInterval(runtime.heartbeat);
    await new Promise((resolve) => runtime.healthServer.close(() => resolve()));
    await Promise.allSettled(runtime.workers.map((w) => w.close()));
    await Promise.allSettled([...runtime.queues.values()].map((q) => q.close()));
    await closeRedis();
    await closePool();
}
/** Worker service entrypoint. */
export function main() {
    assertRuntimeConfig();
    logger.info('TrustVexa worker service starting');
    const { queues, workers } = bootstrapQueues();
    const heartbeat = startHeartbeat();
    const healthServer = startHealthServer({ logger, getHeartbeat: getHeartbeatLiveness });
    const runtime = { queues, workers, heartbeat, healthServer };
    void scheduleLifecycleSweep(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule lifecycle sweep');
    });
    void scheduleDepositWatchSweep(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule deposit-watch sweep');
    });
    void scheduleBackupRestoreTest(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule backup-restore test sweep');
    });
    void scheduleDbBackup(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule daily DB backup');
    });
    void scheduleEmailDigest(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule email digest cron');
    });
    void scheduleIdempotencyCleanup(queues).catch((err) => {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, 'failed to schedule idempotency-keys cleanup');
    });
    const onSignal = (signal) => {
        logger.info({ signal }, 'received shutdown signal');
        void shutdown(runtime).finally(() => process.exit(0));
    };
    process.once('SIGTERM', onSignal);
    process.once('SIGINT', onSignal);
    logger.info({ queues: queues.size, heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS }, 'worker bootstrapped');
    return runtime;
}
// Run only when executed directly (node dist/index.js), not when imported.
const entryPoint = process.argv[1];
if (entryPoint !== undefined && fileURLToPath(import.meta.url) === entryPoint) {
    main();
}
//# sourceMappingURL=index.js.map