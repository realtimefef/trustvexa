// Persistence for cookie consent records (task 8.3). consent_choices is stored
// as JSON; user_id is optional (anonymous visitors use visitor_id only).
// Not barrel-exported.
export async function recordConsent(tx, input) {
    const { rows } = await tx.query(`INSERT INTO cookie_consents (user_id, visitor_id, consent_choices, consented_at)
		 VALUES ($1, $2, $3, now())
		 RETURNING id, user_id, visitor_id, consent_choices, consented_at`, [input.userId, input.visitorId, input.consentChoices]);
    const row = rows[0];
    if (!row)
        throw new Error('recordConsent returned no row');
    return row;
}
/** Most recent consent for a visitor (the effective choice). */
export async function latestConsent(tx, visitorId) {
    const { rows } = await tx.query(`SELECT id, user_id, visitor_id, consent_choices, consented_at
		 FROM cookie_consents WHERE visitor_id = $1
		 ORDER BY consented_at DESC LIMIT 1`, [visitorId]);
    return rows[0] ?? null;
}
//# sourceMappingURL=consent.repository.js.map