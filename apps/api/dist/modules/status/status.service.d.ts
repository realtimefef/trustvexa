export type OverallStatus = 'operational' | 'degraded';
export interface PausedScopeView {
    scope: string;
    reason: string | null;
    since: string | null;
}
export interface FeatureFlagView {
    flagKey: string;
    isEnabled: boolean;
    scope: string | null;
}
export interface PlatformStatusView {
    status: OverallStatus;
    pausedScopes: PausedScopeView[];
    featureFlags: FeatureFlagView[];
    checkedAt: string;
}
export declare function getPlatformStatus(): Promise<PlatformStatusView>;
//# sourceMappingURL=status.service.d.ts.map