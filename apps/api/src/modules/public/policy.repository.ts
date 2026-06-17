// Persistence for policy versions (task 8.2). Unique on (doc_type, version);
// callers handle the conflict when publishing. Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface PolicyVersionRow {
  id: string;
  doc_type: string;
  version: number;
  summary: string;
  content_hash: string;
  published_at: string;
}

export async function publishVersion(
  tx: TxClient,
  input: { docType: string; version: number; summary: string; contentHash: string },
): Promise<PolicyVersionRow> {
  const { rows } = await tx.query<PolicyVersionRow>(
    `INSERT INTO policy_versions (doc_type, version, summary, content_hash, published_at)
		 VALUES ($1, $2, $3, $4, now())
		 RETURNING id, doc_type, version, summary, content_hash, published_at`,
    [input.docType, input.version, input.summary, input.contentHash],
  );
  const row = rows[0];
  if (!row) throw new Error('publishVersion returned no row');
  return row;
}

export async function latestPublishedVersion(
  tx: TxClient,
  docType: string,
): Promise<PolicyVersionRow | null> {
  const { rows } = await tx.query<PolicyVersionRow>(
    `SELECT id, doc_type, version, summary, content_hash, published_at
		 FROM policy_versions WHERE doc_type = $1
		 ORDER BY version DESC LIMIT 1`,
    [docType],
  );
  return rows[0] ?? null;
}

/** Latest published version number per doc_type, for the re-acceptance gate. */
export async function currentVersionsByDoc(tx: TxClient): Promise<Record<string, number>> {
  const { rows } = await tx.query<{ doc_type: string; version: number }>(
    `SELECT doc_type, MAX(version) AS version FROM policy_versions GROUP BY doc_type`,
  );
  const out: Record<string, number> = {};
  for (const row of rows) out[row.doc_type] = row.version;
  return out;
}
