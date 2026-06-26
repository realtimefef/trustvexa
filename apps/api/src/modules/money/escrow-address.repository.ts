/**
 * Escrow address persistence (task 5.17, DB-bound).
 *
 * One deposit address per deal in `escrow_addresses`. The derivation_index is
 * assigned by the caller from the HD wallet manager; this module only stores
 * and retrieves the public address. Raw key material is never written here.
 */
export interface EscrowAddressTxClient {
  query: <R = unknown>(
    text: string,
    params?: readonly unknown[],
  ) => Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface EscrowAddressRow {
  id: string;
  deal_id: string;
  coin: string;
  network: string;
  address: string;
  derivation_index: number | null;
}

export async function getEscrowAddress(
  client: EscrowAddressTxClient,
  dealId: string,
): Promise<EscrowAddressRow | null> {
  const { rows } = await client.query<EscrowAddressRow>(
    `SELECT id, deal_id, coin, network, address, derivation_index
			 FROM escrow_addresses
			WHERE deal_id = $1
			LIMIT 1`,
    [dealId],
  );
  return rows[0] ?? null;
}

export interface InsertEscrowAddressInput {
  dealId: string;
  coin: string;
  network: string;
  address: string;
  derivationIndex: number | null;
}

/**
 * Escrow addresses for deals that are awaiting on-chain funding.
 *
 * A deal becomes fundable once its terms are accepted (`Confirmed`): the
 * `FundsHeld` event then transitions it to `Funded`. The deposit-watcher
 * (`@trustvexa/worker`) sweeps these rows, queries each address on its chain,
 * and credits matching deposits idempotently. The expected coin/network/amount
 * and the risk score travel from the immutable funding snapshot on `deals` so
 * the watcher can classify deposits and pick the right confirmation threshold.
 * Read-only; no key material is exposed.
 */
export interface PendingDepositAddressRow {
  escrow_address_id: string;
  deal_id: string;
  coin: string;
  network: string;
  address: string;
  /** Expected deposit amount in integer smallest units (string from PG bigint). */
  amount_smallest_unit: string | null;
  /** Allowed over/under-payment band as a percentage (PG numeric -> string). */
  price_tolerance_pct: string | null;
  /** Deal risk score used to derive the confirmation risk tier (nullable). */
  risk_score: number | null;
}

/** Deal statuses in which an escrow address is actively awaiting funding. */
export const DEPOSIT_WATCH_STATUSES: readonly string[] = ['Confirmed', 'Amended'];

export async function listEscrowAddressesAwaitingFunding(
  client: EscrowAddressTxClient,
  limit = 500,
): Promise<PendingDepositAddressRow[]> {
  const { rows } = await client.query<PendingDepositAddressRow>(
    `SELECT ea.id AS escrow_address_id,
				 ea.deal_id AS deal_id,
				 ea.coin AS coin,
				 ea.network AS network,
				 ea.address AS address,
				 d.amount_smallest_unit AS amount_smallest_unit,
				 d.price_tolerance_pct AS price_tolerance_pct,
				 d.risk_score AS risk_score
			 FROM escrow_addresses ea
			 JOIN deals d ON d.id = ea.deal_id
			WHERE d.status = ANY($1::deal_status[])
			ORDER BY ea.created_at ASC
			LIMIT $2`,
    [DEPOSIT_WATCH_STATUSES, limit],
  );
  return rows;
}

/** Insert the deal's escrow address, returning the existing row if one exists. */
export async function insertEscrowAddress(
  client: EscrowAddressTxClient,
  input: InsertEscrowAddressInput,
): Promise<EscrowAddressRow> {
  const existing = await getEscrowAddress(client, input.dealId);
  if (existing) return existing;
  const { rows } = await client.query<EscrowAddressRow>(
    `INSERT INTO escrow_addresses (deal_id, coin, network, address, derivation_index)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, deal_id, coin, network, address, derivation_index`,
    [input.dealId, input.coin, input.network, input.address, input.derivationIndex],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to insert escrow address');
  return row;
}
