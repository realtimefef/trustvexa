export type ComponentStatus = 'up' | 'degraded' | 'down';
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';
export interface ComponentHealth {
    name: string;
    status: ComponentStatus;
    /** Whether this component is required for the platform to be usable. */
    critical: boolean;
}
export declare const MONITORED_COMPONENTS: readonly ["web", "worker", "database", "redis", "chains"];
/**
 * Roll up component states:
 * - any critical component down  -> unhealthy
 * - any component degraded/down  -> degraded
 * - otherwise                    -> healthy
 */
export declare function overallHealth(components: readonly ComponentHealth[]): OverallStatus;
export declare function isServable(status: OverallStatus): boolean;
//# sourceMappingURL=health.d.ts.map