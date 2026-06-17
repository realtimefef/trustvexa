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
export class AccessDeniedError extends Error {
    code = 'ACCESS_DENIED';
    constructor(message = 'You do not have access to this resource') {
        super(message);
        this.name = 'AccessDeniedError';
    }
}
function isOwner(actor, ownership) {
    return ownership.ownerUserIds.includes(actor.userId);
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
export async function assertRowAccess(actor, ownership, mode, opts = {}) {
    if (isOwner(actor, ownership))
        return;
    const elevated = actor.role === 'middleman' || actor.role === 'admin';
    if (!elevated) {
        throw new AccessDeniedError();
    }
    // Middleman cannot silently mutate counterparty-owned rows without a reason.
    if (mode === 'write' && !opts.reason) {
        throw new AccessDeniedError('Elevated writes require an audit reason');
    }
    if (ownership.containsPii && opts.recorder) {
        const targetUserId = ownership.ownerUserIds.find((id) => id !== actor.userId) ?? null;
        await opts.recorder.record({
            actorId: actor.userId,
            targetUserId,
            dealId: ownership.dealId ?? null,
            fieldType: ownership.fieldType ?? null,
            reason: opts.reason ?? `${actor.role}_${mode}`,
        });
    }
}
/** Non-throwing predicate form, for filtering result sets. */
export function canAccessRow(actor, ownership) {
    return isOwner(actor, ownership) || actor.role === 'middleman' || actor.role === 'admin';
}
//# sourceMappingURL=accessGuard.js.map