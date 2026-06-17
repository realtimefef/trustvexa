/** Liveness state of a single backing dependency. */
export type DependencyState = 'ok' | 'down';
/** Per-dependency health result. `detail` is present only when `down`. */
export interface DependencyStatus {
    readonly name: string;
    readonly status: DependencyState;
    readonly detail?: string;
}
/** Aggregate connectivity result across all checked dependencies. */
export interface ConnectivityResult {
    readonly status: 'ok' | 'degraded';
    readonly dependencies: DependencyStatus[];
}
/** Default per-probe timeout. Health checks must stay lightweight. */
export declare const DEFAULT_HEALTH_TIMEOUT_MS = 3000;
/** Probe PostgreSQL connectivity with a lightweight `SELECT 1`. Never throws. */
export declare function checkPostgres(timeoutMs?: number): Promise<DependencyStatus>;
/** Probe Redis connectivity with `PING`. Never throws. */
export declare function checkRedis(timeoutMs?: number): Promise<DependencyStatus>;
/**
 * Probe PostgreSQL and Redis together. The aggregate status is `ok` only when
 * every dependency is `ok`, otherwise `degraded`. Never throws.
 */
export declare function checkConnectivity(timeoutMs?: number): Promise<ConnectivityResult>;
//# sourceMappingURL=health.d.ts.map