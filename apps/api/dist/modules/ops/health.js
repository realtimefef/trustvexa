// Health-check aggregation (task 9.2, Requirement 45.1). Pure roll-up of
// component states into an overall status for the /health endpoint.
export const MONITORED_COMPONENTS = ['web', 'worker', 'database', 'redis', 'chains'];
/**
 * Roll up component states:
 * - any critical component down  -> unhealthy
 * - any component degraded/down  -> degraded
 * - otherwise                    -> healthy
 */
export function overallHealth(components) {
    let degraded = false;
    for (const c of components) {
        if (c.status === 'down' && c.critical)
            return 'unhealthy';
        if (c.status === 'down' || c.status === 'degraded')
            degraded = true;
    }
    return degraded ? 'degraded' : 'healthy';
}
export function isServable(status) {
    return status !== 'unhealthy';
}
//# sourceMappingURL=health.js.map