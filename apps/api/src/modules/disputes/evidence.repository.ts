// Persistence for dispute evidence (task 7.5). Evidence is hashed and locked at
// upload time; locked rows are immutable. Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface EvidenceRow {
  id: string;
  dispute_id: string;
  file_key: string;
  file_hash: string;
  mime_type: string;
  uploaded_by: string;
  review_status: string;
  reviewed_by: string | null;
  locked_at: string | null;
  created_at: string;
}

/** Insert evidence already hashed and immediately locked at upload (Req 24.3). */
export async function insertLockedEvidence(
  tx: TxClient,
  input: {
    disputeId: string;
    fileKey: string;
    fileHash: string;
    mimeType: string;
    uploadedBy: string;
  },
): Promise<EvidenceRow> {
  const { rows } = await tx.query<EvidenceRow>(
    `INSERT INTO dispute_evidence
		   (dispute_id, file_key, file_hash, mime_type, uploaded_by, review_status, locked_at)
		 VALUES ($1, $2, $3, $4, $5, 'pending', now())
		 RETURNING id, dispute_id, file_key, file_hash, mime_type, uploaded_by,
		          review_status, reviewed_by, locked_at, created_at`,
    [input.disputeId, input.fileKey, input.fileHash, input.mimeType, input.uploadedBy],
  );
  const row = rows[0];
  if (!row) throw new Error('insertLockedEvidence returned no row');
  return row;
}

export async function listEvidence(tx: TxClient, disputeId: string): Promise<EvidenceRow[]> {
  const { rows } = await tx.query<EvidenceRow>(
    `SELECT id, dispute_id, file_key, file_hash, mime_type, uploaded_by,
		        review_status, reviewed_by, locked_at, created_at
		 FROM dispute_evidence WHERE dispute_id = $1 ORDER BY created_at ASC`,
    [disputeId],
  );
  return rows;
}

export async function setEvidenceReview(
  tx: TxClient,
  input: { evidenceId: string; reviewStatus: string; reviewedBy: string },
): Promise<void> {
  await tx.query(`UPDATE dispute_evidence SET review_status = $2, reviewed_by = $3 WHERE id = $1`, [
    input.evidenceId,
    input.reviewStatus,
    input.reviewedBy,
  ]);
}
