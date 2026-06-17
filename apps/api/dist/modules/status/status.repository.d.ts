export interface ActivePauseRow {
    scope: string;
    reason: string | null;
    started_at: Date | string | null;
}
export interface FeatureFlagRow {
    flag_key: string;
    is_enabled: boolean;
    scope: string | null;
}
/** Currently-active incident pauses (started, not ended). */
export declare function listActivePauses(): Promise<ActivePauseRow[]>;
/** All feature flags, ordered by key for a stable response. */
export declare function listFeatureFlags(): Promise<FeatureFlagRow[]>;
//# sourceMappingURL=status.repository.d.ts.map