/**
 * Repository-layer row-level access guard (task 2.9).
 *
 * Enforces design §31: every user may read/write only the rows they own; the
 * single middleman has elevated access that is *always* audited; and every
 * middleman view of counterparty PII is recorded to `pii_access_logs`.
 *
 * This is the single chokepoint repositories call before returning or mutating
 * a row that belongs to a deal party. It is transport-agnostic and has no `pg`
 * dependency — the PII recorder is injected so the api/worker wire it to the
 * `pii_access_logs` table.
 */
/** Roles recognized by the access guard. */
export type ActorRole = 'user' | 'middleman' | 'admin';
/** The authenticated actor performing a repository operation. */
export interface Actor {
    userId: string;
    role: ActorRole;
}
/** Ownership facts about the row being accessed. */
export interface RowOwnership {
    /** User IDs that directly own / are party to this row. */
    ownerUserIds: string[];
    /** Deal the row belongs to, if any (used for audit context). */
    dealId?: string;
    /** Whether the row contains counterparty PII (drives audit logging). */
    containsPii?: boolean;
    /** Logical field/category for the audit record, e.g. 'handover_secret'. */
    fieldType?: string;
}
export type AccessMode = 'read' | 'write';
/** Sink for middleman/admin PII access events (→ `pii_access_logs`). */
export interface PiiAccessRecorder {
    record(entry: {
        actorId: string;
        targetUserId: string | null;
        dealId: string | null;
        fieldType: string | null;
        reason: string;
    }): Promise<void>;
}
export declare class AccessDeniedError extends Error {
    readonly code = "ACCESS_DENIED";
    constructor(message?: string);
}
/**
 * Throw {@link AccessDeniedError} unless the actor may access the row.
 *
 * - `user`: only their own rows.
 * - `middleman`: elevated access; counterparty-PII reads are audited.
 * - `admin`: platform-operations access; PII reads are audited.
 *
 * When access is granted to a middleman/admin who is *not* an owner and the row
 * carries PII, an entry is written to `pii_access_logs` via `recorder`.
 */
export declare function assertRowAccess(actor: Actor, ownership: RowOwnership, mode: AccessMode, opts?: {
    recorder?: PiiAccessRecorder;
    reason?: string;
}): Promise<void>;
/** Non-throwing predicate form, for filtering result sets. */
export declare function canAccessRow(actor: Actor, ownership: RowOwnership): boolean;
//# sourceMappingURL=accessGuard.d.ts.map