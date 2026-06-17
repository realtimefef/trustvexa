export interface SettingChangeView {
    id: string;
    settingKey: string;
    reason: string;
    status: string;
    oldValue: string;
    newValue: string;
    cooldownUntil: string | null;
    appliedAt: string | null;
    rollbackAt: string | null;
    createdAt: string;
}
export interface SettingChangeRequestInput {
    settingKey: string;
    oldValue: string;
    newValue: string;
    reason: string;
}
export interface SettingChangeHistory {
    settingKey: string;
    changes: SettingChangeView[];
}
/** Validate, preview, and persist a requested change (cooling down if critical). */
export declare function requestSettingChange(actorId: string, input: SettingChangeRequestInput): Promise<SettingChangeView>;
/** Apply a pending/cooling-down change once its cooldown has elapsed. */
export declare function applySettingChange(changeId: string): Promise<SettingChangeView>;
/** Roll back a previously applied change. */
export declare function rollbackSettingChange(changeId: string): Promise<SettingChangeView>;
/** Full audit history for a setting key, newest first. */
export declare function listSettingChanges(settingKey: string): Promise<SettingChangeHistory>;
//# sourceMappingURL=admin-setting.service.d.ts.map