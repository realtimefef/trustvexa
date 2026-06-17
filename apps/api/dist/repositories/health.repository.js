import { checkConnectivity } from '@trustvexa/shared/health';
export class HealthRepository {
    /**
     * Lightweight liveness used by `/health/ping`: reports the dependency list
     * without performing I/O.
     */
    checkDependencies() {
        return [
            { name: 'postgres', status: 'unchecked' },
            { name: 'redis', status: 'unchecked' },
        ];
    }
    /**
     * Real connectivity probe used by `/healthz`: pings PostgreSQL and Redis via
     * the shared lazy clients. Resolves with per-dependency status (never throws).
     */
    async checkConnectivity() {
        return checkConnectivity();
    }
}
//# sourceMappingURL=health.repository.js.map