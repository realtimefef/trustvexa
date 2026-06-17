// Persistence for treasury reconciliation snapshots (task 7.4). All balances
// are smallest-unit integers stored as numeric and bound as strings.
// Not barrel-exported.

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface TreasurySnapshotRow {
  id: string;
  snapshot_at: string;
  coin: string;
  network: string;
  held_in_escrow: string;
  owed_to_sellers: string;
  refunds_owed: string;
  platform_fee_revenue: string;
  gas_spent: string;
  hot_balance: string;
  cold_balance: string;
  ledger_balance: string;
  onchain_balance: string;
  reconciled: boolean;
  created_at: string;
}

export interface InsertSnapshotInput {
  coin: string;
  network: string;
  heldInEscrow: bigint;
  owedToSellers: bigint;
  refundsOwed: bigint;
  platformFeeRevenue: bigint;
  gasSpent: bigint;
  hotBalance: bigint;
  coldBalance: bigint;
  ledgerBalance: bigint;
  onchainBalance: bigint;
  reconciled: boolean;
}

export async function insertSnapshot(
  tx: TxClient,
  input: InsertSnapshotInput,
): Promise<TreasurySnapshotRow> {
  const { rows } = await tx.query<TreasurySnapshotRow>(
    `INSERT INTO treasury_snapshots
		   (snapshot_at, coin, network, held_in_escrow, owed_to_sellers, refunds_owed,
		    platform_fee_revenue, gas_spent, hot_balance, cold_balance,
		    ledger_balance, onchain_balance, reconciled)
		 VALUES (now(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, snapshot_at, coin, network, held_in_escrow, owed_to_sellers,
		          refunds_owed, platform_fee_revenue, gas_spent, hot_balance,
		          cold_balance, ledger_balance, onchain_balance, reconciled, created_at`,
    [
      input.coin,
      input.network,
      input.heldInEscrow.toString(),
      input.owedToSellers.toString(),
      input.refundsOwed.toString(),
      input.platformFeeRevenue.toString(),
      input.gasSpent.toString(),
      input.hotBalance.toString(),
      input.coldBalance.toString(),
      input.ledgerBalance.toString(),
      input.onchainBalance.toString(),
      input.reconciled,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('insertSnapshot returned no row');
  return row;
}

export async function latestSnapshot(
  tx: TxClient,
  coin: string,
  network: string,
): Promise<TreasurySnapshotRow | null> {
  const { rows } = await tx.query<TreasurySnapshotRow>(
    `SELECT id, snapshot_at, coin, network, held_in_escrow, owed_to_sellers,
		        refunds_owed, platform_fee_revenue, gas_spent, hot_balance,
		        cold_balance, ledger_balance, onchain_balance, reconciled, created_at
		 FROM treasury_snapshots WHERE coin = $1 AND network = $2
		 ORDER BY created_at DESC LIMIT 1`,
    [coin, network],
  );
  return rows[0] ?? null;
}
