/**
 * Background-job payload contracts + defensive parsers.
 *
 * BullMQ delivers `job.data` as untyped JSON, so each queue's payload is parsed
 * and validated here before a processor runs. The worker has no Zod dependency,
 * so these are small hand-written guards that throw
 * {@link InvalidJobPayloadError} (a non-retryable, dead-letter-worthy error) on
 * malformed input. bigint money amounts travel as decimal strings to preserve
 * precision across the JSON boundary.
 *
 * The literal unions below (notification event types, dead-letter statuses) are
 * intentionally local copies of the domain unions: they are structurally
 * identical, so values flow into the API domain functions without coupling the
 * worker's payload layer to the API's internal module graph.
 */

export class InvalidJobPayloadError extends Error {
  constructor(message: string) {
    super(`invalid_job_payload:${message}`);
    this.name = 'InvalidJobPayloadError';
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null) {
    throw new InvalidJobPayloadError('payload must be a JSON object');
  }
  return data as Record<string, unknown>;
}

function reqString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new InvalidJobPayloadError(`"${key}" must be a non-empty string`);
  }
  return value;
}

function optString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidJobPayloadError(`"${key}" must be a string`);
  }
  return value;
}

function reqStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new InvalidJobPayloadError(`"${key}" must be a string[]`);
  }
  return value as string[];
}

function reqBigint(record: Record<string, unknown>, key: string): bigint {
  const value = record[key];
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new InvalidJobPayloadError(`"${key}" must be an integer string`);
  }
  try {
    return BigInt(value);
  } catch {
    throw new InvalidJobPayloadError(`"${key}" is not a valid integer`);
  }
}

function optBigint(record: Record<string, unknown>, key: string): bigint | undefined {
  if (record[key] === undefined || record[key] === null) return undefined;
  return reqBigint(record, key);
}

function reqRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  return asRecord(record[key]);
}

function optRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (value === undefined || value === null) return {};
  return asRecord(value);
}

function reqInt(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new InvalidJobPayloadError(`"${key}" must be an integer`);
  }
  return value;
}

// ── email ─────────────────────────────────────────────────────────

export interface EmailJob {
  readonly to: string;
  readonly subject?: string;
  readonly html?: string;
  readonly text?: string;
  readonly templateName?: string;
  readonly templateData?: Record<string, unknown>;
}
export function parseEmailJob(data: unknown): EmailJob {
  const r = asRecord(data);
  const to = reqString(r, 'to');
  const templateName = optString(r, 'templateName');
  if (templateName) {
    return {
      to,
      templateName,
      templateData: optRecord(r, 'templateData'),
    };
  }
  const base: EmailJob = {
    to,
    subject: reqString(r, 'subject'),
    html: reqString(r, 'html'),
  };
  const text = optString(r, 'text');
  return text === undefined ? base : { ...base, text };
}

// ── notification fan-out ─────────────────────────────────────────

export type NotificationEventType =
  | 'deal:update'
  | 'payment:received'
  | 'confirmation:update'
  | 'payout:update'
  | 'refund:update'
  | 'dispute:update'
  | 'chat:message'
  | 'sla:warning';

const NOTIFICATION_EVENT_TYPES: readonly NotificationEventType[] = [
  'deal:update',
  'payment:received',
  'confirmation:update',
  'payout:update',
  'refund:update',
  'dispute:update',
  'chat:message',
  'sla:warning',
];

export interface NotificationFanoutJob {
  readonly eventType: NotificationEventType;
  readonly dealId: string | null;
  readonly recipientUserIds: string[];
  readonly payload: Record<string, unknown>;
}
export function parseNotificationFanoutJob(data: unknown): NotificationFanoutJob {
  const r = asRecord(data);
  const eventType = reqString(r, 'eventType');
  if (!NOTIFICATION_EVENT_TYPES.includes(eventType as NotificationEventType)) {
    throw new InvalidJobPayloadError('"eventType" is not a known notification event');
  }
  const dealId = optString(r, 'dealId');
  return {
    eventType: eventType as NotificationEventType,
    dealId: dealId ?? null,
    recipientUserIds: reqStringArray(r, 'recipientUserIds'),
    payload: optRecord(r, 'payload'),
  };
}

// ── payout processing ────────────────────────────────────────────
//
// Two-signature authorization (preflight) runs in the API request path before a
// payout is ever enqueued. The worker only carries an already-authorized payout
// through its on-chain `broadcast` then `confirm` transitions, guarded by the
// repository's optimistic version check.

export type PayoutAction = 'broadcast' | 'confirm';
export interface PayoutProcessingJob {
  readonly payoutId: string;
  readonly expectedVersion: number;
  readonly action: PayoutAction;
  readonly coin: string;
  readonly network: string;
  readonly toAddress: string;
  readonly amountSmallestUnit: bigint;
  readonly txHash?: string;
}
export function parsePayoutProcessingJob(data: unknown): PayoutProcessingJob {
  const r = asRecord(data);
  const action = reqString(r, 'action');
  if (action !== 'broadcast' && action !== 'confirm') {
    throw new InvalidJobPayloadError('"action" must be broadcast|confirm');
  }
  const base: PayoutProcessingJob = {
    payoutId: reqString(r, 'payoutId'),
    expectedVersion: reqInt(r, 'expectedVersion'),
    action,
    coin: reqString(r, 'coin'),
    network: reqString(r, 'network'),
    toAddress: reqString(r, 'toAddress'),
    amountSmallestUnit: reqBigint(r, 'amountSmallestUnit'),
  };
  const txHash = optString(r, 'txHash');
  return txHash === undefined ? base : { ...base, txHash };
}

// ── media scan ──────────────────────────────────────────────────

export interface MediaScanJob {
  readonly attachmentId: string;
  readonly storageKey: string;
  readonly sha256?: string;
}
export function parseMediaScanJob(data: unknown): MediaScanJob {
  const r = asRecord(data);
  const base: MediaScanJob = {
    attachmentId: reqString(r, 'attachmentId'),
    storageKey: reqString(r, 'storageKey'),
  };
  const sha256 = optString(r, 'sha256');
  return sha256 === undefined ? base : { ...base, sha256 };
}

// ── fx refresh ────────────────────────────────────────────────

export interface FxRefreshJob {
  readonly coin: string;
  readonly fiat: string;
  readonly referenceRate?: number;
}
export function parseFxRefreshJob(data: unknown): FxRefreshJob {
  const r = asRecord(data);
  const base: FxRefreshJob = {
    coin: reqString(r, 'coin'),
    fiat: reqString(r, 'fiat'),
  };
  const ref = r['referenceRate'];
  if (ref === undefined || ref === null) return base;
  if (typeof ref !== 'number' || !Number.isFinite(ref)) {
    throw new InvalidJobPayloadError('"referenceRate" must be a finite number');
  }
  return { ...base, referenceRate: ref };
}

// ── reconciliation ────────────────────────────────────────────

export interface ReconciliationJob {
  readonly coin: string;
  readonly network: string;
  readonly ledgerBalance: bigint;
  readonly onchainBalance: bigint;
  readonly toleranceUnits?: bigint;
  readonly snapshot: {
    readonly heldInEscrow: bigint;
    readonly owedToSellers: bigint;
    readonly refundsOwed: bigint;
    readonly platformFeeRevenue: bigint;
    readonly gasSpent: bigint;
    readonly hotBalance: bigint;
    readonly coldBalance: bigint;
  };
}
export function parseReconciliationJob(data: unknown): ReconciliationJob {
  const r = asRecord(data);
  const snap = reqRecord(r, 'snapshot');
  const job: ReconciliationJob = {
    coin: reqString(r, 'coin'),
    network: reqString(r, 'network'),
    ledgerBalance: reqBigint(r, 'ledgerBalance'),
    onchainBalance: reqBigint(r, 'onchainBalance'),
    snapshot: {
      heldInEscrow: reqBigint(snap, 'heldInEscrow'),
      owedToSellers: reqBigint(snap, 'owedToSellers'),
      refundsOwed: reqBigint(snap, 'refundsOwed'),
      platformFeeRevenue: reqBigint(snap, 'platformFeeRevenue'),
      gasSpent: reqBigint(snap, 'gasSpent'),
      hotBalance: reqBigint(snap, 'hotBalance'),
      coldBalance: reqBigint(snap, 'coldBalance'),
    },
  };
  const tol = optBigint(r, 'toleranceUnits');
  return tol === undefined ? job : { ...job, toleranceUnits: tol };
}

// ── dead-letter control ────────────────────────────────────────
export type DlqStatus = 'pending' | 'retrying' | 'failed' | 'resolved';
const DLQ_STATUSES: readonly DlqStatus[] = ['pending', 'retrying', 'failed', 'resolved'];

function reqDlqStatus(record: Record<string, unknown>, key: string): DlqStatus {
  const value = reqString(record, key);
  if (!DLQ_STATUSES.includes(value as DlqStatus)) {
    throw new InvalidJobPayloadError(`"${key}" must be a dead-letter status`);
  }
  return value as DlqStatus;
}

export interface DeadLetterControlJob {
  readonly deadLetterId: string;
  readonly fromStatus: DlqStatus;
  readonly toStatus: DlqStatus;
}
export function parseDeadLetterControlJob(data: unknown): DeadLetterControlJob {
  const r = asRecord(data);
  return {
    deadLetterId: reqString(r, 'deadLetterId'),
    fromStatus: reqDlqStatus(r, 'fromStatus'),
    toStatus: reqDlqStatus(r, 'toStatus'),
  };
}

// ── deposit watch ──────────────────────────────────────────────
//
// The repeatable deposit-watch sweep carries no required fields: each run loads
// the pending escrow addresses awaiting funding and queries them per chain. An
// optional `networks` filter restricts a run to specific chains (e.g. a manual
// re-check of a single chain) without changing the default full-sweep behavior.

export type DepositWatchNetwork = 'ETH' | 'BNB' | 'TRON' | 'SOLANA';
const DEPOSIT_WATCH_NETWORKS: readonly DepositWatchNetwork[] = ['ETH', 'BNB', 'TRON', 'SOLANA'];

export interface DepositWatchJob {
  readonly networks?: DepositWatchNetwork[];
}
export function parseDepositWatchJob(data: unknown): DepositWatchJob {
  // An empty/absent payload is the normal repeatable-sweep case.
  if (data === undefined || data === null) return {};
  const r = asRecord(data);
  const raw = r['networks'];
  if (raw === undefined || raw === null) return {};
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
    throw new InvalidJobPayloadError('"networks" must be a string[]');
  }
  const networks = raw as string[];
  for (const n of networks) {
    if (!DEPOSIT_WATCH_NETWORKS.includes(n as DepositWatchNetwork)) {
      throw new InvalidJobPayloadError(`"networks" contains unsupported chain: ${n}`);
    }
  }
  return networks.length === 0 ? {} : { networks: networks as DepositWatchNetwork[] };
}
