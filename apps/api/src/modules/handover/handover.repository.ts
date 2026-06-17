// Persistence for handover items, the secret vault, and access logs (task 7.2).
// Secrets are stored encrypted; every view/reveal/download is logged.
// Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface HandoverItemRow {
  id: string;
  deal_id: string;
  seller_id: string;
  middleman_id: string | null;
  encrypted_payload: string;
  item_type: string;
  verification_status: string;
  reveal_status: string;
  transferred_to_buyer_at: string | null;
  created_at: string;
}

export async function createHandoverItem(
  tx: TxClient,
  input: {
    dealId: string;
    sellerId: string;
    encryptedPayload: string;
    itemType: 'account' | 'digital_product';
  },
): Promise<HandoverItemRow> {
  const { rows } = await tx.query<HandoverItemRow>(
    `INSERT INTO handover_items
		   (deal_id, seller_id, encrypted_payload, item_type, verification_status, reveal_status)
		 VALUES ($1, $2, $3, $4, 'pending', 'middleman_only')
		 RETURNING id, deal_id, seller_id, middleman_id, encrypted_payload, item_type,
		          verification_status, reveal_status, transferred_to_buyer_at, created_at`,
    [input.dealId, input.sellerId, input.encryptedPayload, input.itemType],
  );
  const row = rows[0];
  if (!row) throw new Error('createHandoverItem returned no row');
  return row;
}

/** Reveal credentials to the buyer (middleman action); also stamps transfer time. */
export async function revealToBuyer(
  tx: TxClient,
  itemId: string,
  middlemanId: string,
): Promise<number> {
  const result = await tx.query(
    `UPDATE handover_items
		 SET reveal_status = 'revealed_to_buyer', middleman_id = $2, transferred_to_buyer_at = now()
		 WHERE id = $1 AND reveal_status = 'middleman_only'`,
    [itemId, middlemanId],
  );
  return result.rowCount ?? 0;
}

export async function addVaultSecret(
  tx: TxClient,
  input: {
    handoverItemId: string;
    secretType: 'login' | 'recovery' | 'file_link' | 'note';
    secretEnc: string;
  },
): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO handover_vault_items (handover_item_id, secret_type, secret_enc)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
    [input.handoverItemId, input.secretType, input.secretEnc],
  );
  const row = rows[0];
  if (!row) throw new Error('addVaultSecret returned no row');
  return row.id;
}

export async function logAccess(
  tx: TxClient,
  input: {
    handoverItemId: string;
    viewerId: string;
    accessType: 'view' | 'reveal' | 'download';
  },
): Promise<void> {
  await tx.query(
    `INSERT INTO handover_access_logs (handover_item_id, viewer_id, access_type)
		 VALUES ($1, $2, $3)`,
    [input.handoverItemId, input.viewerId, input.accessType],
  );
}
