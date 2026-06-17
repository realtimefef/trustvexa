import { type PauseScope } from '../launch/emergency-pause.js';
import * as repo from './admin-ops.repository.js';
export interface DealSearchItem {
    id: string;
    status: string;
    riskScore: number | null;
    dealAmountCents: string | null;
    coin: string;
    network: string;
    isPractice: boolean;
    holdStatus: string | null;
    legalHold: boolean;
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
    lastActivityAt: string | null;
    createdAt: string | null;
}
export declare function searchDeals(filters: {
    status?: string;
    risk?: number;
    q?: string;
    limit?: number;
}): Promise<{
    deals: DealSearchItem[];
}>;
export interface UserSearchItem {
    id: string;
    username: string;
    accountType: string;
    accountStatus: string;
    accountLabel: string;
    trustLevel: number;
    legalHold: boolean;
    createdAt: string | null;
}
export declare function searchUsers(filters: {
    q?: string;
    status?: string;
    label?: string;
    limit?: number;
}): Promise<{
    users: UserSearchItem[];
}>;
export declare function getAnalytics(): Promise<{
    analytics: repo.AnalyticsSnapshotRow | null;
    fraudAnalytics: repo.FraudAnalyticsSnapshotRow | null;
}>;
export interface HoldView {
    id: string;
    dealId: string;
    holdType: string | null;
    reason: string | null;
    visibleMessage: string | null;
    userNextAction: string | null;
    estimatedNextStepAt: string | null;
    startedBy: string | null;
    releasedBy: string | null;
    createdAt: string | null;
}
export declare function listHolds(): Promise<{
    holds: HoldView[];
}>;
/** Place a manual review hold (idempotent on an active hold of the same type). */
export declare function placeHold(input: {
    actorId: string;
    dealId: string;
    holdType: string;
    reason: string;
    visibleMessage: string | null;
    requestId: string;
}): Promise<{
    hold: HoldView;
    alreadyOnHold: boolean;
}>;
/** Release a hold (idempotent; releasing an already-released hold is a no-op). */
export declare function releaseHold(input: {
    actorId: string;
    holdId: string;
    reason: string;
    requestId: string;
}): Promise<{
    hold: HoldView;
    alreadyReleased: boolean;
}>;
export interface OverrideView {
    id: string;
    actorId: string | null;
    dealId: string | null;
    overrideType: string | null;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    confirmedAt: string | null;
    createdAt: string | null;
}
export declare function listOverrides(dealId?: string): Promise<{
    overrides: OverrideView[];
}>;
/** Record a controlled manual override (idempotent on an identical correction). */
export declare function recordOverride(input: {
    actorId: string;
    dealId: string;
    overrideType: string;
    oldValue: string;
    newValue: string;
    reason: string;
    confirmed: boolean;
    requestId: string;
}): Promise<{
    override: OverrideView;
    alreadyRecorded: boolean;
}>;
export interface NoteView {
    id: string;
    targetType: string | null;
    targetId: string | null;
    note: string | null;
    createdBy: string | null;
    createdAt: string | null;
}
export declare function listNotes(targetType: string, targetId: string): Promise<{
    notes: NoteView[];
}>;
/** Add a private admin note (idempotent on identical content by the same author). */
export declare function addNote(input: {
    actorId: string;
    targetType: string;
    targetId: string;
    note: string;
}): Promise<{
    note: NoteView;
    alreadyExists: boolean;
}>;
export interface PauseView {
    id: string;
    scope: string;
    reason: string | null;
    startedBy: string | null;
    startedAt: string | null;
    endedBy: string | null;
    endedAt: string | null;
}
export declare function listPauses(): Promise<{
    pauses: PauseView[];
}>;
/** Start an emergency pause (idempotent on an already-active pause for the scope). */
export declare function startPause(input: {
    actorId: string;
    scope: PauseScope;
    reason: string;
    requestId: string;
}): Promise<{
    pause: PauseView;
    alreadyActive: boolean;
}>;
/** End a pause (idempotent; ending an already-ended pause is a no-op). */
export declare function endPause(input: {
    actorId: string;
    pauseId: string;
    reason: string;
    requestId: string;
}): Promise<{
    pause: PauseView;
    alreadyEnded: boolean;
}>;
export interface FeatureFlagView {
    flagKey: string;
    description: string | null;
    isEnabled: boolean;
    scope: string | null;
    updatedBy: string | null;
    createdAt: string | null;
}
export declare function listFeatureFlags(): Promise<{
    flags: FeatureFlagView[];
}>;
/** Toggle a feature flag's enabled state (audited). 404 when the flag is unknown. */
export declare function toggleFeatureFlag(input: {
    actorId: string;
    key: string;
    isEnabled: boolean;
    reason: string;
    requestId: string;
}): Promise<{
    flag: FeatureFlagView;
}>;
export interface AuditLogItem {
    id: string;
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason: string;
    requiresConfirmation: boolean;
    requestId: string;
    metadata: Record<string, unknown>;
    prevHash: string;
    entryHash: string;
    createdAt: string;
}
export declare function getAuditLog(): Promise<{
    auditLog: AuditLogItem[];
}>;
export interface AnnouncementView {
    id: string;
    title: string | null;
    body: string | null;
    audience: string | null;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string | null;
}
export declare function createAnnouncement(input: {
    actorId: string;
    title: string;
    body: string;
    audience: string;
    startsAt?: string | null;
    endsAt?: string | null;
    requestId: string;
}): Promise<{
    announcement: AnnouncementView;
}>;
export interface ChatSearchItem {
    id: string;
    dealId: string;
    type: string;
    status: string;
    createdAt: string | null;
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
}
export declare function searchChats(limit?: number): Promise<{
    chats: ChatSearchItem[];
}>;
export declare function deleteChat(input: {
    actorId: string;
    chatId: string;
    reason: string;
    requestId: string;
}): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=admin-ops.service.d.ts.map