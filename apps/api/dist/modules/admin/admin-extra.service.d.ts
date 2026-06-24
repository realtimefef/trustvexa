export interface LegalHoldView {
    id: string;
    targetType: string;
    targetId: string | null;
    reason: string | null;
    placedBy: string | null;
    placedAt: string | null;
    createdAt: string | null;
}
export declare function listLegalHolds(): Promise<{
    holds: LegalHoldView[];
}>;
export declare function placeLegalHold(input: {
    actorId: string;
    targetType: 'deal' | 'user';
    targetId: string;
    reason: string;
    requestId: string;
}): Promise<{
    id: string;
}>;
export declare function releaseLegalHold(input: {
    actorId: string;
    holdId: string;
    reason: string;
    requestId: string;
}): Promise<{
    released: boolean;
}>;
export interface AppealView {
    id: string;
    userId: string;
    username: string | null;
    restrictionType: string | null;
    reason: string | null;
    status: string | null;
    decisionReason: string | null;
    decidedAt: string | null;
    createdAt: string | null;
}
export declare function listAppeals(status?: string): Promise<{
    appeals: AppealView[];
}>;
export declare function decideAppeal(input: {
    actorId: string;
    appealId: string;
    decision: 'approved' | 'rejected';
    decisionReason: string;
    requestId: string;
}): Promise<{
    decided: boolean;
    decision: string;
}>;
export interface AmlAlertView {
    id: string;
    userId: string | null;
    username: string | null;
    dealId: string | null;
    patternType: string | null;
    severity: string | null;
    details: string | null;
    status: string | null;
    createdAt: string | null;
}
export declare function listAmlAlerts(status?: string): Promise<{
    alerts: AmlAlertView[];
}>;
export declare function listAmlAlertsForDeal(dealId: string): Promise<{
    alerts: AmlAlertView[];
}>;
export declare function updateAmlAlert(input: {
    actorId: string;
    alertId: string;
    status: string;
    requestId: string;
}): Promise<{
    updated: boolean;
}>;
export interface BreakGlassView {
    id: string;
    actorLabel: string | null;
    action: string | null;
    reason: string | null;
    createdAt: string | null;
}
export declare function listBreakGlass(): Promise<{
    events: BreakGlassView[];
}>;
export declare function recordBreakGlass(input: {
    actorId: string;
    actorLabel: string;
    action: string;
    reason: string;
    requestId: string;
}): Promise<{
    id: string;
}>;
export interface PiiLookupResult {
    userId: string;
    username: string | null;
    values: Array<{
        field: string;
        value: string | null;
    }>;
}
export declare function lookupUserPii(input: {
    actorId: string;
    targetUserId: string;
    fields: string[];
    reason: string;
}): Promise<PiiLookupResult>;
export interface PiiAccessLogView {
    id: string;
    actorId: string | null;
    targetUserId: string | null;
    dealId: string | null;
    fieldType: string | null;
    reason: string | null;
    createdAt: string | null;
}
export declare function listPiiAccessLogs(targetUserId?: string): Promise<{
    logs: PiiAccessLogView[];
}>;
export interface AllowlistEntryView {
    id: string;
    coin: string | null;
    network: string | null;
    address: string | null;
    label: string | null;
    isActive: boolean;
    activeFrom: string | null;
    createdAt: string | null;
}
export declare function listWithdrawalAllowlist(): Promise<{
    entries: AllowlistEntryView[];
    nowIso: string;
}>;
/**
 * Add a payout/withdrawal address to the allowlist with a time-delay before it
 * becomes usable (custody control). The payout preflight only allows sending to
 * an active allowlist entry whose active_from has elapsed.
 */
export declare function addWithdrawalAllowlist(input: {
    actorId: string;
    coin: string;
    network: string;
    address: string;
    label: string | null;
    delayHours: number;
    requestId: string;
}): Promise<{
    id: string;
    activeFrom: string;
}>;
export declare function setWithdrawalAllowlistActive(input: {
    actorId: string;
    id: string;
    isActive: boolean;
    requestId: string;
}): Promise<{
    updated: boolean;
}>;
//# sourceMappingURL=admin-extra.service.d.ts.map