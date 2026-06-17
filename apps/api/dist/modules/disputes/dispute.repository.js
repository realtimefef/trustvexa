// Persistence for disputes and dispute threads (task 7.5). Not barrel-exported.
export async function openDispute(tx, input) {
    const { rows } = await tx.query(`INSERT INTO disputes (deal_id, raised_by, reason, status)
		 VALUES ($1, $2, $3, 'open')
		 RETURNING id, deal_id, raised_by, reason, status, resolution,
		          final_decision_note, decision_pdf_key, resolved_at, created_at`, [input.dealId, input.raisedBy, input.reason]);
    const row = rows[0];
    if (!row)
        throw new Error('openDispute returned no row');
    return row;
}
export async function getDispute(tx, disputeId) {
    const { rows } = await tx.query(`SELECT id, deal_id, raised_by, reason, status, resolution,
		        final_decision_note, decision_pdf_key, resolved_at, created_at
		 FROM disputes WHERE id = $1`, [disputeId]);
    return rows[0] ?? null;
}
export async function resolveDispute(tx, input) {
    await tx.query(`UPDATE disputes
		 SET status = 'resolved', resolution = $2, final_decision_note = $3,
		     decision_pdf_key = $4, resolved_at = now()
		 WHERE id = $1 AND status IN ('open', 'under_review')`, [input.disputeId, input.resolution, input.decisionNote, input.decisionPdfKey]);
}
/** Lock all threads on a dispute once it is resolved (no further messages). */
export async function lockDisputeThreads(tx, disputeId) {
    await tx.query(`UPDATE dispute_threads SET status = 'locked', locked_at = now()
		 WHERE dispute_id = $1 AND status = 'open'`, [disputeId]);
}
/** Create the open discussion thread for a newly opened dispute. */
export async function createThread(tx, disputeId) {
    const { rows } = await tx.query(`INSERT INTO dispute_threads (dispute_id, status) VALUES ($1, 'open') RETURNING id`, [disputeId]);
    const row = rows[0];
    if (!row)
        throw new Error('createThread returned no row');
    return row.id;
}
/** The newest open thread for a dispute (messages are appended here). */
export async function getOpenThread(tx, disputeId) {
    const { rows } = await tx.query(`SELECT id FROM dispute_threads WHERE dispute_id = $1 AND status = 'open'
		 ORDER BY created_at DESC LIMIT 1`, [disputeId]);
    return rows[0]?.id ?? null;
}
export async function appendThreadMessage(tx, input) {
    const { rows } = await tx.query(`INSERT INTO dispute_thread_messages (thread_id, sender_id, body_enc, role)
		 SELECT $1, $2, $3, $4
		 WHERE EXISTS (SELECT 1 FROM dispute_threads WHERE id = $1 AND status = 'open')
		 RETURNING id`, [input.threadId, input.senderId, input.bodyEnc, input.role]);
    const row = rows[0];
    if (!row)
        throw new Error('cannot post to a locked or missing dispute thread');
    return row.id;
}
//# sourceMappingURL=dispute.repository.js.map