export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface UserStateRow {
    id: string;
    account_status: string;
    account_label: string;
    trust_level: number;
}
/** Lock and read the enforcement-relevant columns of the target user. */
export declare function lockUser(tx: TxClient, userId: string): Promise<UserStateRow | null>;
/**
 * Append one hash-chained `admin_actions` audit row. The chain is global across
 * all admin actions: each entry hashes the previous `entry_hash` plus a
 * canonical payload, so altering or deleting any row breaks every later link.
 */
export declare function appendAdminAction(tx: TxClient, input: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason: string;
    requestId: string;
    metadata: Record<string, unknown>;
}): Promise<string>;
/** Set the target user's account status (e.g. `blocked`, `under_review`, `active`). */
export declare function setAccountStatus(tx: TxClient, userId: string, status: string): Promise<void>;
/** Set the target user's account label (the trust/limit tier). */
export declare function setAccountLabel(tx: TxClient, userId: string, label: string): Promise<void>;
/** Record a platform block row for the target user. */
export declare function insertUserBlock(tx: TxClient, input: {
    blockerId: string;
    blockedUserId: string;
    reason: string;
}): Promise<void>;
/** Apply a trust-level delta and record the trust_events audit row. */
export declare function applyTrustChange(tx: TxClient, input: {
    userId: string;
    change: number;
    reason: string;
}): Promise<number>;
/** Record a user-facing warning notice (shown before/with a restriction). */
export declare function insertWarningNotice(tx: TxClient, input: {
    userId: string;
    warningType: string;
    message: string;
}): Promise<void>;
//# sourceMappingURL=enforcement.repository.d.ts.map