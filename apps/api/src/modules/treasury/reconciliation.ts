// Treasury reconciliation (task 7.4). Pure comparison of the internal ledger
// balance against the observed on-chain balance for a coin/network, producing a
// reconciliation status and mismatch alert. All amounts are smallest-unit
// bigints. (Requirements 45.3, 45.4)

export type ReconciliationStatus = 'reconciled' | 'mismatch' | 'shortfall' | 'surplus';

export interface TreasurySnapshotInput {
  coin: string;
  network: string;
  ledgerBalance: bigint;
  onchainBalance: bigint;
  /** Optional tolerance (smallest units) to absorb dust/gas timing. */
  toleranceUnits?: bigint;
}

export interface ReconciliationResult {
  coin: string;
  network: string;
  status: ReconciliationStatus;
  reconciled: boolean;
  /** onchain - ledger; negative means custody holds less than the ledger claims. */
  delta: bigint;
  mismatchAlert: boolean;
}

export function reconcile(input: TreasurySnapshotInput): ReconciliationResult {
  const tolerance = input.toleranceUnits ?? 0n;
  const delta = input.onchainBalance - input.ledgerBalance;
  const absDelta = delta < 0n ? -delta : delta;
  const within = absDelta <= tolerance;
  let status: ReconciliationStatus;
  if (within) status = 'reconciled';
  else if (delta < 0n) status = 'shortfall';
  else status = 'surplus';
  return {
    coin: input.coin,
    network: input.network,
    status: within ? 'reconciled' : status === 'reconciled' ? 'mismatch' : status,
    reconciled: within,
    delta,
    mismatchAlert: !within,
  };
}

/** A shortfall (custody below ledger) is the urgent, alert-worthy case. */
export function isShortfall(result: ReconciliationResult): boolean {
  return result.status === 'shortfall';
}
