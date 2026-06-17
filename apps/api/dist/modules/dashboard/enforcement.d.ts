export type SettingChangeStatus = 'pending' | 'cooling_down' | 'applied' | 'rolled_back' | 'cancelled';
export declare const CRITICAL_SETTING_KEYS: readonly ["fee_schedule", "payout_controls", "confirmation_thresholds", "withdrawal_limits", "emergency_pause", "trust_thresholds"];
export type CriticalSettingKey = (typeof CRITICAL_SETTING_KEYS)[number];
export declare const DEFAULT_COOLDOWN_MINUTES = 60;
export declare function isCriticalSetting(key: string): key is CriticalSettingKey;
export interface SettingChangeRequest {
    settingKey: string;
    reason: string;
    oldValue: string;
    newValue: string;
}
export type SettingChangeError = 'reason_required' | 'no_change';
export interface SettingChangePlan {
    ok: boolean;
    error?: SettingChangeError;
    requiresCooldown: boolean;
    cooldownMinutes: number;
    /** Human-readable before/after preview. */
    preview: {
        from: string;
        to: string;
    };
}
/** Validate and plan a setting change (reason + preview + cooldown). */
export declare function planSettingChange(req: SettingChangeRequest, cooldownMinutes?: number): SettingChangePlan;
/** A change can apply only once its cooldown has elapsed. */
export declare function canApplyChange(status: SettingChangeStatus, cooldownElapsed: boolean): boolean;
/** Only an applied change can be rolled back. */
export declare function canRollback(status: SettingChangeStatus): boolean;
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface RiskFlag {
    flagType: string;
    severity: RiskSeverity;
}
export interface RiskPanel {
    score: number;
    highestSeverity: RiskSeverity | 'none';
    flagCount: number;
}
/** Aggregate raw risk flags into the middleman risk panel summary. */
export declare function buildRiskPanel(flags: ReadonlyArray<RiskFlag>): RiskPanel;
//# sourceMappingURL=enforcement.d.ts.map