// Persistence for trust events and warning notices (task 7.6). Trust events are
// an append-only ledger of trust-score deltas; the missed-deadline count used
// by the restriction engine is derived from these rows. Not barrel-exported.
export async function appendTrustEvent(tx, input) {
    const { rows } = await tx.query(`INSERT INTO trust_events (user_id, change, reason, deal_id)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, change, reason, deal_id, created_at`, [input.userId, input.change, input.reason, input.dealId]);
    const row = rows[0];
    if (!row)
        throw new Error('appendTrustEvent returned no row');
    return row;
}
/** Count missed-deadline trust events for a user (feeds the restriction engine). */
export async function countMissedDeadlines(tx, userId) {
    const { rows } = await tx.query(`SELECT COUNT(*)::text AS n FROM trust_events
		 WHERE user_id = $1 AND reason = 'missed_deadline'`, [userId]);
    return Number.parseInt(rows[0]?.n ?? '0', 10);
}
export async function insertWarningNotice(tx, input) {
    const { rows } = await tx.query(`INSERT INTO user_warning_notices (user_id, warning_type, deal_id, message)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, warning_type, deal_id, message, acknowledged_at, created_at`, [input.userId, input.warningType, input.dealId, input.message]);
    const row = rows[0];
    if (!row)
        throw new Error('insertWarningNotice returned no row');
    return row;
}
export async function acknowledgeWarning(tx, noticeId) {
    await tx.query(`UPDATE user_warning_notices SET acknowledged_at = now()
		 WHERE id = $1 AND acknowledged_at IS NULL`, [noticeId]);
}
//# sourceMappingURL=trust.repository.js.map