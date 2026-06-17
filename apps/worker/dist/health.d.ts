/**
 * Worker health HTTP listener.
 *
 * The worker is not an HTTP service, but Render needs a health endpoint to
 * gate the worker instance. This exposes a tiny, dependency-free `http` server
 * (separate from the API) that reports PostgreSQL + Redis connectivity plus the
 * heartbeat liveness signal. *(Requirements 45.8)*
 *
 * The connectivity probes reuse the shared lazy clients and never throw, so the
 * endpoint reports a degraded status (HTTP 503) instead of crashing when a
 * dependency is down.
 */
import { type Server } from 'node:http';
import { type Logger } from '@trustvexa/shared/logger';
/** Liveness view of the worker's heartbeat loop. */
export interface HeartbeatLiveness {
    /** Whether the heartbeat has beaten within its expected window. */
    readonly alive: boolean;
    /** ISO timestamp of the last heartbeat, or null if it has not beaten yet. */
    readonly lastBeatAt: string | null;
}
export interface HealthServerOptions {
    /** Port to listen on. Falls back to WORKER_HEALTH_PORT, then PORT, then 3002. */
    readonly port?: number;
    /** Structured logger used to record probe results, correlated by request id. */
    readonly logger: Logger;
    /** Supplies the current heartbeat liveness at probe time. */
    readonly getHeartbeat: () => HeartbeatLiveness;
}
/**
 * Start the worker health server. Responds to `GET /healthz` with an aggregate
 * `ok`/`degraded` status (200/503) covering PostgreSQL, Redis, and heartbeat
 * liveness. Any other path returns 404.
 */
export declare function startHealthServer(options: HealthServerOptions): Server;
//# sourceMappingURL=health.d.ts.map