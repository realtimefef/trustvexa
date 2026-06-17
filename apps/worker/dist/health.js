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
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { checkConnectivity } from '@trustvexa/shared/health';
import { REQUEST_ID_HEADER } from '@trustvexa/shared/logger';
function resolvePort(explicit) {
    if (explicit !== undefined && !Number.isNaN(explicit)) {
        return explicit;
    }
    const fromEnv = process.env.WORKER_HEALTH_PORT ?? process.env.PORT ?? '3002';
    const parsed = Number.parseInt(fromEnv, 10);
    return Number.isNaN(parsed) ? 3002 : parsed;
}
/**
 * Start the worker health server. Responds to `GET /healthz` with an aggregate
 * `ok`/`degraded` status (200/503) covering PostgreSQL, Redis, and heartbeat
 * liveness. Any other path returns 404.
 */
export function startHealthServer(options) {
    const port = resolvePort(options.port);
    const { logger, getHeartbeat } = options;
    const server = createServer((req, res) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
        res.setHeader('X-Request-Id', requestId);
        if (req.method !== 'GET' || req.url !== '/healthz') {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ error_code: 'not_found', request_id: requestId }));
            return;
        }
        void (async () => {
            const connectivity = await checkConnectivity();
            const heartbeat = getHeartbeat();
            const dependencies = [
                ...connectivity.dependencies,
                {
                    name: 'heartbeat',
                    status: heartbeat.alive ? 'ok' : 'down',
                    ...(heartbeat.lastBeatAt !== null ? {} : { detail: 'no heartbeat yet' }),
                },
            ];
            const healthy = connectivity.status === 'ok' && heartbeat.alive;
            const body = {
                status: healthy ? 'ok' : 'degraded',
                service: '@trustvexa/worker',
                dependencies,
                last_heartbeat_at: heartbeat.lastBeatAt,
                request_id: requestId,
            };
            logger.info({ request_id: requestId, status: body.status }, 'worker healthz probe');
            res.writeHead(healthy ? 200 : 503, { 'content-type': 'application/json' });
            res.end(JSON.stringify(body));
        })();
    });
    server.listen(port, () => {
        logger.info({ port }, 'worker health server listening');
    });
    return server;
}
//# sourceMappingURL=health.js.map