/**
 * Shared connectivity health-check helpers.
 *
 * Node-only subpath module (`@trustvexa/shared/health`) consumed by
 * `@trustvexa/api` and `@trustvexa/worker` to report PostgreSQL + Redis
 * liveness for their `/healthz` endpoints. *(Requirements 45.8)*
 *
 * These probes use the existing lazy DB pool and Redis client, so importing
 * this module never opens a connection and builds/tests do not require live
 * services. Every probe is wrapped so it NEVER throws and NEVER hangs: a
 * dependency that is down (or slow) resolves to a `down` status within the
 * timeout rather than rejecting, letting callers report a degraded state with
 * an appropriate HTTP code instead of crashing.
 */
import { getPool } from './db.js';
import { getRedis } from './redis.js';
/** Default per-probe timeout. Health checks must stay lightweight. */
export const DEFAULT_HEALTH_TIMEOUT_MS = 3000;
/**
 * Race a (non-rejecting) probe against a timeout. The first to settle wins; a
 * late-settling probe is ignored. `probe` is expected to catch its own errors
 * so this never produces an unhandled rejection.
 */
function withTimeout(probe, ms, onTimeout) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(onTimeout()), ms);
        // Do not keep the event loop alive solely for the health timeout.
        timer.unref();
        void probe.then((value) => {
            clearTimeout(timer);
            resolve(value);
        });
    });
}
/** Probe PostgreSQL connectivity with a lightweight `SELECT 1`. Never throws. */
export async function checkPostgres(timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS) {
    const probe = (async () => {
        try {
            await getPool().query('SELECT 1');
            return { name: 'postgres', status: 'ok' };
        }
        catch (err) {
            return { name: 'postgres', status: 'down', detail: err.message };
        }
    })();
    return withTimeout(probe, timeoutMs, () => ({
        name: 'postgres',
        status: 'down',
        detail: 'timeout',
    }));
}
/** Probe Redis connectivity with `PING`. Never throws. */
export async function checkRedis(timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS) {
    const probe = (async () => {
        try {
            const pong = await getRedis().ping();
            return pong === 'PONG'
                ? { name: 'redis', status: 'ok' }
                : { name: 'redis', status: 'down', detail: `unexpected reply: ${pong}` };
        }
        catch (err) {
            return { name: 'redis', status: 'down', detail: err.message };
        }
    })();
    return withTimeout(probe, timeoutMs, () => ({
        name: 'redis',
        status: 'down',
        detail: 'timeout',
    }));
}
/**
 * Probe PostgreSQL and Redis together. The aggregate status is `ok` only when
 * every dependency is `ok`, otherwise `degraded`. Never throws.
 */
export async function checkConnectivity(timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS) {
    const dependencies = await Promise.all([checkPostgres(timeoutMs), checkRedis(timeoutMs)]);
    const status = dependencies.every((dep) => dep.status === 'ok') ? 'ok' : 'degraded';
    return { status, dependencies };
}
//# sourceMappingURL=health.js.map