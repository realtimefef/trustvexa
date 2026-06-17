/**
 * Persistence for dispute threads — open/lookup helpers used by the dispute
 * write endpoints (Requirements 24.1, 24.2). A dispute owns one open thread; it
 * is created when the dispute is opened and locked when the dispute resolves.
 * Statements are appended via `appendThreadMessage` in `dispute.repository.ts`.
 * Not barrel-exported.
 */
/** Create the initial open thread for a freshly opened dispute. */
export async function createThread(tx, disputeId) {
    const { rows } = await tx.query(`INSERT INTO dispute_threads (dispute_id, status)
		 VALUES ($1, 'open')
		 RETURNING id, dispute_id, status, locked_at, created_at`, [disputeId]);
    const row = rows[0];
    if (!row)
        throw new Error('createThread returned no row');
    return row;
}
/**
 * Return the dispute's current open thread id, or null when none is open (the
 * dispute has no thread yet or every thread is locked). Used to target a posted
 * statement; the insert itself re-checks the thread is still `open`.
 */
export async function getOpenThreadId(tx, disputeId) {
    const { rows } = await tx.query(`SELECT id FROM dispute_threads
		 WHERE dispute_id = $1 AND status = 'open'
		 ORDER BY created_at ASC LIMIT 1`, [disputeId]);
    return rows[0]?.id ?? null;
}
//# sourceMappingURL=dispute-thread.repository.js.map