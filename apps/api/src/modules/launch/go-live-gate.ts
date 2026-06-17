// Pre-deploy go-live gate (task 9.7, Requirements 41.1-41.7). Blocks real-money
// operation until every operator-provided prerequisite is supplied & verified.
// Until the gate passes, the platform stays in testnet/practice mode.

export type OperatorInputKey =
  | 'business_entity'
  | 'escrow_wallets'
  | 'signing_keys'
  | 'rpc_endpoints'
  | 'google_oauth'
  | 'mail_provider'
  | 'object_storage'
  | 'cdn_waf';

export interface OperatorInputSpec {
  key: OperatorInputKey;
  label: string;
}

export const REQUIRED_OPERATOR_INPUTS: readonly OperatorInputSpec[] = [
  { key: 'business_entity', label: 'Registered business entity / legal address' },
  { key: 'escrow_wallets', label: 'Operator escrow + cold wallet addresses' },
  { key: 'signing_keys', label: 'Offline-generated signing keys' },
  { key: 'rpc_endpoints', label: 'Per-chain primary + backup RPC endpoints' },
  { key: 'google_oauth', label: 'Google OAuth credentials' },
  { key: 'mail_provider', label: 'Outbound mail provider with SPF/DKIM/DMARC' },
  { key: 'object_storage', label: 'S3-compatible object storage credentials' },
  { key: 'cdn_waf', label: 'Cloudflare CDN/WAF + domain hardening' },
];

export interface GoLiveBlocker {
  key: OperatorInputKey;
  label: string;
}

export interface GoLiveStatus {
  ready: boolean;
  blockers: GoLiveBlocker[];
}

/**
 * Evaluate the go-live gate. `provided[key] === true` means the operator input
 * is supplied AND verified. Any missing/false input is a blocker.
 */
export function evaluateGoLive(
  provided: Readonly<Partial<Record<OperatorInputKey, boolean>>>,
): GoLiveStatus {
  const blockers: GoLiveBlocker[] = [];
  for (const spec of REQUIRED_OPERATOR_INPUTS) {
    if (provided[spec.key] !== true) {
      blockers.push({ key: spec.key, label: spec.label });
    }
  }
  return { ready: blockers.length === 0, blockers };
}

/** Real-money (mainnet) operation is permitted only once the gate is green. */
export function realMoneyAllowed(status: GoLiveStatus): boolean {
  return status.ready;
}
