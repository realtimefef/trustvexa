// Stuck-tx handling, hot/cold custody split, sweeps, and gas reserve (task 5.25).
// Pure decision logic. Raw private keys are NEVER stored in the app, DB, or
// cloud; assertNoRawKeyMaterial enforces that no key-like string leaks into a
// persisted record. (Requirements 22.9, 22.10, 22.11, 23.1-23.10)

export function isStuckTx(
  submittedAtIso: string,
  nowIso: string,
  stuckAfterSeconds: number,
): boolean {
  const submitted = Date.parse(submittedAtIso);
  const now = Date.parse(nowIso);
  return (now - submitted) / 1000 >= stuckAfterSeconds;
}

export type StuckAction = 'fee_bump' | 'replace_by_fee' | 'tracked_retry';

/**
 * Choose a recovery action for a stuck tx. EVM chains support replace-by-fee /
 * fee-bump (same nonce); others get a tracked retry. Never produces a second,
 * independent paying transaction.
 */
export function planStuckTxAction(chainSupportsRbf: boolean, canBumpFee: boolean): StuckAction {
  if (chainSupportsRbf) return 'replace_by_fee';
  if (canBumpFee) return 'fee_bump';
  return 'tracked_retry';
}

export interface PayingTxRef {
  nonce: number | null; // chains without a nonce use null + intentKey
  intentKey: string; // stable per logical payout (e.g. payout_queue id)
}

export class DuplicatePayingTxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicatePayingTxError';
  }
}

/**
 * A replacement tx must represent the SAME logical payment (same intent, and
 * same nonce where the chain has one). Otherwise it would be a second paying
 * tx — a double spend of escrow funds.
 */
export function assertNotDuplicatePayingTx(original: PayingTxRef, replacement: PayingTxRef): void {
  if (original.intentKey !== replacement.intentKey) {
    throw new DuplicatePayingTxError('replacement targets a different payout intent');
  }
  if (
    original.nonce !== null &&
    replacement.nonce !== null &&
    original.nonce !== replacement.nonce
  ) {
    throw new DuplicatePayingTxError('replacement uses a different nonce; would double-pay');
  }
}

export interface SweepPlan {
  shouldSweep: boolean;
  sweepAmountSmallestUnit: bigint;
}

/**
 * Sweep excess hot-wallet balance to cold storage when it exceeds the sweep
 * threshold, leaving exactly the target operational reserve behind.
 */
export function sweepPlan(
  hotBalanceSmallestUnit: bigint,
  sweepThresholdSmallestUnit: bigint,
  targetReserveSmallestUnit: bigint,
): SweepPlan {
  if (hotBalanceSmallestUnit <= sweepThresholdSmallestUnit) {
    return { shouldSweep: false, sweepAmountSmallestUnit: 0n };
  }
  const sweep = hotBalanceSmallestUnit - targetReserveSmallestUnit;
  return sweep > 0n
    ? { shouldSweep: true, sweepAmountSmallestUnit: sweep }
    : { shouldSweep: false, sweepAmountSmallestUnit: 0n };
}

export interface GasReserveStatus {
  low: boolean;
  topUpAmountSmallestUnit: bigint;
  pauseRiskyPayouts: boolean;
}

/** Gas reserve health: below the minimum triggers a top-up and pauses payouts. */
export function gasReserveStatus(
  balanceSmallestUnit: bigint,
  minReserveSmallestUnit: bigint,
  topUpToSmallestUnit: bigint,
): GasReserveStatus {
  const low = balanceSmallestUnit < minReserveSmallestUnit;
  const topUp =
    low && topUpToSmallestUnit > balanceSmallestUnit
      ? topUpToSmallestUnit - balanceSmallestUnit
      : 0n;
  return { low, topUpAmountSmallestUnit: topUp, pauseRiskyPayouts: low };
}

/**
 * Address-poisoning heuristic: an attacker seeds a look-alike address sharing
 * the victim's leading/trailing characters but differing in the middle.
 */
export function isLookAlikeAddress(real: string, candidate: string, edge = 4): boolean {
  if (real === candidate) return false;
  if (real.length < edge * 2 || candidate.length < edge * 2) return false;
  const sameHead = real.slice(0, edge).toLowerCase() === candidate.slice(0, edge).toLowerCase();
  const sameTail = real.slice(-edge).toLowerCase() === candidate.slice(-edge).toLowerCase();
  return sameHead && sameTail;
}

export class RawKeyMaterialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RawKeyMaterialError';
  }
}

const KEY_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b0x[0-9a-fA-F]{64}\b/, // raw 32-byte EVM private key
  /\b[0-9a-fA-F]{64}\b/, // bare 64-hex secret
];

function scan(value: unknown, hit: () => void): void {
  if (typeof value === 'string') {
    if (KEY_PATTERNS.some((re) => re.test(value))) hit();
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) scan(v, hit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) scan(v, hit);
  }
}

/** Throws if any string in the record looks like raw private-key material. */
export function assertNoRawKeyMaterial(record: unknown): void {
  let found = false;
  scan(record, () => {
    found = true;
  });
  if (found) throw new RawKeyMaterialError('record contains raw key material; refusing to persist');
}
