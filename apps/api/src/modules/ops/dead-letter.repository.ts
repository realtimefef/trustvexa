// Persistence for dead_letter_jobs (task 9.2). payload_enc is encrypted before
// insert by the caller. Not barrel-exported.
import type { DlqStatus } from './dead-letter.js';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface DeadLetterJobRow {
  id: string;
  job_type: string;
  original_job_id: string;
  payload_enc: string;
  failure_reason: string;
  retry_count: number;
  status: DlqStatus;
  last_failed_at: string;
}

export async function recordDeadLetter(
  tx: TxClient,
  input: {
    jobType: string;
    originalJobId: string;
    payloadEnc: string;
    failureReason: string;
    retryCount: number;
    status: DlqStatus;
  },
): Promise<DeadLetterJobRow> {
  const { rows } = await tx.query<DeadLetterJobRow>(
    `INSERT INTO dead_letter_jobs
		   (job_type, original_job_id, payload_enc, failure_reason, retry_count, status, last_failed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, now())
		 RETURNING id, job_type, original_job_id, payload_enc, failure_reason, retry_count, status, last_failed_at`,
    [
      input.jobType,
      input.originalJobId,
      input.payloadEnc,
      input.failureReason,
      input.retryCount,
      input.status,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('recordDeadLetter returned no row');
  return row;
}

export async function setDeadLetterStatus(
  tx: TxClient,
  id: string,
  status: DlqStatus,
): Promise<void> {
  await tx.query(`UPDATE dead_letter_jobs SET status = $2 WHERE id = $1`, [id, status]);
}
