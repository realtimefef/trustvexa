export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface AdminSettingChangeRow {
    id: string;
    actor_id: string;
    setting_key: string;
    old_value_enc: string;
    new_value_enc: string;
    reason: string;
    status: string;
    cooldown_until: string | null;
    applied_at: string | null;
    rollback_at: string | null;
    created_at: string;
}
export declare function requestChange(tx: TxClient, input: {
    actorId: string;
    settingKey: string;
    oldValueEnc: string;
    newValueEnc: string;
    reason: string;
    cooldownUntil: string | null;
}): Promise<AdminSettingChangeRow>;
/** Mark a change applied only if it is past any cooldown window. */
export declare function markApplied(tx: TxClient, changeId: string): Promise<boolean>;
export declare function markRolledBack(tx: TxClient, changeId: string): Promise<boolean>;
export declare function listChanges(tx: TxClient, settingKey: string): Promise<AdminSettingChangeRow[]>;
/** Load a single change by id (for apply/rollback state checks within a transaction). */
export declare function getChangeById(tx: TxClient, changeId: string): Promise<AdminSettingChangeRow | null>;
//# sourceMappingURL=admin-setting.repository.d.ts.map