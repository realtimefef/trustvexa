export async function recordDeadLetter(tx, input) {
    const { rows } = await tx.query(`INSERT INTO dead_letter_jobs
		   (job_type, original_job_id, payload_enc, failure_reason, retry_count, status, last_failed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())
		 RETURNING id, job_type, original_job_id, payload_enc, failure_reason, retry_count, status, last_failed_at`, [
        input.jobType,
        input.originalJobId,
        input.payloadEnc,
        input.failureReason,
        input.retryCount,
        input.status,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('recordDeadLetter returned no row');
    return row;
}
export async function setDeadLetterStatus(tx, id, status) {
    await tx.query(`UPDATE dead_letter_jobs SET status = $2 WHERE id = $1`, [id, status]);
}
//# sourceMappingURL=dead-letter.repository.js.map