import type { TxClient } from './enforcement.repository.js';
import type { DealStatus } from '../deal/state-machine.js';
import type { PauseScope } from '../launch/emergency-pause.js';
import type { FlagScope } from '../launch/feature-flags.js';
export interface DealSearchRow {
    id: string;
    status: DealStatus;
    risk_score: number | null;
    deal_amount: string | null;
    coin: string;
    network: string;
    is_practice: boolean;
    hold_status: string | null;
    legal_hold: boolean;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
    last_activity_at: Date | string | null;
    created_at: Date | string;
}
export interface DealSearchFilters {
    status?: string;
    minRisk?: number;
    q?: string;
    limit: number;
}
/** Search/filter deals by status, minimum risk score and free text on id/coin. */
export declare function searchDeals(filters: DealSearchFilters): Promise<DealSearchRow[]>;
export interface UserSearchRow {
    id: string;
    username: string;
    account_type: string;
    account_status: string;
    account_label: string;
    trust_level: number;
    legal_hold: boolean;
    created_at: Date | string;
}
export interface UserSearchFilters {
    q?: string;
    status?: string;
    label?: string;
    limit: number;
}
/**
 * Search/filter users. Never selects `password_hash` and never selects/decrypts
 * the `*_enc` PII columns — only non-sensitive account metadata is returned.
 */
export declare function searchUsers(filters: UserSearchFilters): Promise<UserSearchRow[]>;
export interface AnalyticsSnapshotRow {
    id: string;
    snapshot_date: Date | string | null;
    total_deals: number | null;
    active_deals: number | null;
    completed_deals: number | null;
    disputed_deals: number | null;
    refunded_amount: string | null;
    released_amount: string | null;
    avg_completion_time: string | null;
    common_dispute_reason: string | null;
    payment_issue_count: number | null;
    created_at: Date | string;
}
export interface FraudAnalyticsSnapshotRow {
    id: string;
    snapshot_date: Date | string | null;
    repeated_wrong_network_count: number | null;
    repeated_dispute_count: number | null;
    failed_code_burst_count: number | null;
    new_device_wallet_change_count: number | null;
    high_risk_wallet_count: number | null;
    blocked_user_count: number | null;
    created_at: Date | string;
}
/** Latest analytics snapshot (most recent snapshot_date), or null when none. */
export declare function getLatestAnalyticsSnapshot(): Promise<AnalyticsSnapshotRow | null>;
/** Latest fraud analytics snapshot, or null when none. */
export declare function getLatestFraudAnalyticsSnapshot(): Promise<FraudAnalyticsSnapshotRow | null>;
export interface HoldRow {
    id: string;
    deal_id: string;
    hold_type: string | null;
    reason: string | null;
    visible_message: string | null;
    user_next_action: string | null;
    estimated_next_step_at: Date | string | null;
    started_by: string | null;
    released_by: string | null;
    created_at: Date | string;
}
/** Active holds = rows that have not yet been released (`released_by IS NULL`). */
export declare function listActiveHolds(limit: number): Promise<HoldRow[]>;
/** Active hold of a given type on a deal, for idempotent placement. */
export declare function findActiveHold(tx: TxClient, dealId: string, holdType: string): Promise<HoldRow | null>;
export declare function insertHold(tx: TxClient, input: {
    dealId: string;
    holdType: string;
    reason: string;
    visibleMessage: string | null;
    startedBy: string;
}): Promise<HoldRow>;
export declare function getHoldById(tx: TxClient, holdId: string): Promise<HoldRow | null>;
/** Release a hold; updates only when still active. Returns the updated row. */
export declare function releaseHold(tx: TxClient, holdId: string, releasedBy: string): Promise<HoldRow | null>;
export interface OverrideRow {
    id: string;
    actor_id: string | null;
    deal_id: string | null;
    override_type: string | null;
    old_value: string | null;
    new_value: string | null;
    reason: string | null;
    confirmed_at: Date | string | null;
    created_at: Date | string;
}
/** List overrides, optionally scoped to one deal. */
export declare function listOverrides(dealId?: string): Promise<OverrideRow[]>;
/** A matching override, for idempotent recording of the same correction. */
export declare function findOverride(tx: TxClient, input: {
    dealId: string;
    overrideType: string;
    oldValue: string;
    newValue: string;
}): Promise<OverrideRow | null>;
export declare function insertOverride(tx: TxClient, input: {
    actorId: string;
    dealId: string;
    overrideType: string;
    oldValue: string;
    newValue: string;
    reason: string;
}): Promise<OverrideRow>;
export interface NoteRow {
    id: string;
    target_type: string | null;
    target_id: string | null;
    note_enc: string | null;
    created_by: string | null;
    created_at: Date | string;
}
export declare function listNotes(targetType: string, targetId: string): Promise<NoteRow[]>;
/** A note with identical content by the same author, for idempotent adds. */
export declare function findNote(tx: TxClient, input: {
    targetType: string;
    targetId: string;
    noteEnc: string;
    createdBy: string;
}): Promise<NoteRow | null>;
export declare function insertNote(tx: TxClient, input: {
    targetType: string;
    targetId: string;
    noteEnc: string;
    createdBy: string;
}): Promise<NoteRow>;
export interface PauseRow {
    id: string;
    scope: string;
    reason: string | null;
    started_by: string | null;
    started_at: Date | string | null;
    ended_by: string | null;
    ended_at: Date | string | null;
}
export declare function listActivePauses(): Promise<PauseRow[]>;
/** Active pause for a scope, for idempotent start. */
export declare function findActivePauseByScope(tx: TxClient, scope: PauseScope): Promise<PauseRow | null>;
export declare function insertPause(tx: TxClient, input: {
    scope: PauseScope;
    reason: string;
    startedBy: string;
}): Promise<PauseRow>;
export declare function getPauseById(tx: TxClient, pauseId: string): Promise<PauseRow | null>;
/** End a pause; updates only when still active. Returns the updated row. */
export declare function endPauseById(tx: TxClient, pauseId: string, endedBy: string): Promise<PauseRow | null>;
export interface FeatureFlagRow {
    id: string;
    flag_key: string;
    description: string | null;
    is_enabled: boolean;
    scope: FlagScope | null;
    updated_by: string | null;
    created_at: Date | string;
}
export declare function listFeatureFlags(): Promise<FeatureFlagRow[]>;
export declare function getFeatureFlag(tx: TxClient, key: string): Promise<FeatureFlagRow | null>;
/** Toggle a flag's enabled state, preserving description/scope. */
export declare function updateFeatureFlag(tx: TxClient, input: {
    key: string;
    isEnabled: boolean;
    updatedBy: string;
}): Promise<FeatureFlagRow | null>;
export interface AuditActionRow {
    id: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id: string;
    reason: string;
    requires_confirmation: boolean;
    request_id: string;
    metadata: Record<string, unknown> | null;
    prev_hash: string;
    entry_hash: string;
    created_at: Date | string;
}
export declare function listAuditLogs(limit: number): Promise<AuditActionRow[]>;
export interface AnnouncementRow {
    id: string;
    title: string | null;
    body: string | null;
    audience: string | null;
    starts_at: Date | string | null;
    ends_at: Date | string | null;
    created_at: Date | string;
}
export declare function insertAnnouncement(tx: TxClient, input: {
    title: string;
    body: string;
    audience: string;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
}): Promise<AnnouncementRow>;
export interface ChatSearchRow {
    id: string;
    deal_id: string;
    type: string;
    status: string;
    created_at: Date | string;
    buyer_id: string | null;
    seller_id: string | null;
    middleman_id: string | null;
}
export declare function searchChats(limit: number): Promise<ChatSearchRow[]>;
export declare function deleteChat(tx: TxClient, chatId: string): Promise<boolean>;
//# sourceMappingURL=admin-ops.repository.d.ts.map