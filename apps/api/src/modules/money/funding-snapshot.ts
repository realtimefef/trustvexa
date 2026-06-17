// Immutable funding snapshots locked at confirm/funding time (task 5.15).
// Once built a snapshot is deeply frozen and may never change; any later write
// that disagrees with the stored snapshot is rejected. This is the data-model
// side of Property 6. (Requirements 17.9, 17.10, 21.1, 21.3)

import type { FeePayer } from './fee-engine.js';

export interface FundingSnapshotInput {
  coin: string;
  network: string;
  dealAmount: bigint; // USD value in integer cents
  feePayer: FeePayer;
  platformFee: bigint; // cents
  sellerSettlementFee: bigint; // cents
  transactionFee: bigint; // gas pass-through, cents
  buyerTotal: bigint; // cents the buyer must deposit (USD basis)
  sellerPayout: bigint; // cents the seller receives (USD basis)
  amountCoin: string; // display amount in whole coin units
  amountSmallestUnit: bigint; // on-chain integer smallest units
  lockedFxRate: string; // numeric rate, kept as string for exactness
  fxSource: string;
}

export interface FundingSnapshot {
  readonly coin: string;
  readonly network: string;
  readonly dealAmount: bigint;
  readonly feePayer: FeePayer;
  readonly platformFee: bigint;
  readonly sellerSettlementFee: bigint;
  readonly transactionFee: bigint;
  readonly buyerTotal: bigint;
  readonly sellerPayout: bigint;
  readonly amountCoin: string;
  readonly amountSmallestUnit: bigint;
  readonly lockedFxRate: string;
  readonly fxSource: string;
}

export const FUNDING_SNAPSHOT_FIELDS = [
  'coin',
  'network',
  'dealAmount',
  'feePayer',
  'platformFee',
  'sellerSettlementFee',
  'transactionFee',
  'buyerTotal',
  'sellerPayout',
  'amountCoin',
  'amountSmallestUnit',
  'lockedFxRate',
  'fxSource',
] as const satisfies ReadonlyArray<keyof FundingSnapshot>;

export class FundingSnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FundingSnapshotError';
  }
}

export class FundingSnapshotMutationError extends Error {
  readonly changedFields: ReadonlyArray<keyof FundingSnapshot>;
  constructor(changedFields: ReadonlyArray<keyof FundingSnapshot>) {
    super(`funding snapshot is immutable; attempted to change: ${changedFields.join(', ')}`);
    this.name = 'FundingSnapshotMutationError';
    this.changedFields = changedFields;
  }
}

/**
 * Build a validated, deeply frozen funding snapshot. The model-independent
 * conservation invariant `buyerTotal - sellerPayout === platformFee +
 * sellerSettlementFee + transactionFee` ties the snapshot to the double-entry
 * ledger regardless of who pays the fees.
 */
export function buildFundingSnapshot(input: FundingSnapshotInput): FundingSnapshot {
  const amounts: Array<[string, bigint]> = [
    ['dealAmount', input.dealAmount],
    ['platformFee', input.platformFee],
    ['sellerSettlementFee', input.sellerSettlementFee],
    ['transactionFee', input.transactionFee],
    ['buyerTotal', input.buyerTotal],
    ['sellerPayout', input.sellerPayout],
    ['amountSmallestUnit', input.amountSmallestUnit],
  ];
  for (const [name, value] of amounts) {
    if (value < 0n) throw new FundingSnapshotError(`${name} must be non-negative`);
  }
  if (input.amountSmallestUnit <= 0n) {
    throw new FundingSnapshotError('amountSmallestUnit must be positive');
  }
  if (input.dealAmount <= 0n) {
    throw new FundingSnapshotError('dealAmount must be positive');
  }
  if (input.buyerTotal < input.dealAmount) {
    throw new FundingSnapshotError('buyerTotal must be at least dealAmount');
  }
  if (input.sellerPayout > input.dealAmount) {
    throw new FundingSnapshotError('sellerPayout must not exceed dealAmount');
  }
  const totalFees = input.platformFee + input.sellerSettlementFee + input.transactionFee;
  if (input.buyerTotal - input.sellerPayout !== totalFees) {
    throw new FundingSnapshotError(
      'snapshot does not conserve funds (buyerTotal - sellerPayout != fees)',
    );
  }
  if (!input.lockedFxRate || !input.fxSource || !input.coin || !input.network) {
    throw new FundingSnapshotError('coin, network, lockedFxRate, and fxSource are required');
  }
  const snapshot: FundingSnapshot = {
    coin: input.coin,
    network: input.network,
    dealAmount: input.dealAmount,
    feePayer: input.feePayer,
    platformFee: input.platformFee,
    sellerSettlementFee: input.sellerSettlementFee,
    transactionFee: input.transactionFee,
    buyerTotal: input.buyerTotal,
    sellerPayout: input.sellerPayout,
    amountCoin: input.amountCoin,
    amountSmallestUnit: input.amountSmallestUnit,
    lockedFxRate: input.lockedFxRate,
    fxSource: input.fxSource,
  };
  return Object.freeze(snapshot);
}

/** Return the snapshot fields whose values differ between two snapshots. */
export function diffSnapshot(a: FundingSnapshot, b: FundingSnapshot): Array<keyof FundingSnapshot> {
  const changed: Array<keyof FundingSnapshot> = [];
  for (const field of FUNDING_SNAPSHOT_FIELDS) {
    if (a[field] !== b[field]) changed.push(field);
  }
  return changed;
}

/**
 * Guard a re-persist/update: the incoming snapshot must be byte-for-byte equal
 * to the stored one, otherwise the write is an illegal mutation.
 */
export function assertSnapshotImmutable(stored: FundingSnapshot, incoming: FundingSnapshot): void {
  const changed = diffSnapshot(stored, incoming);
  if (changed.length > 0) throw new FundingSnapshotMutationError(changed);
}
