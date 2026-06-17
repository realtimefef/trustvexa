export type PreflightCheckName = 'deal_status' | 'no_dispute_or_legal_hold' | 'address_present' | 'chain_supported' | 'token_contract_allowlisted' | 'amount_matches_snapshot' | 'gas_reserve' | 'operator_daily_cap' | 'withdrawal_allowlist' | 'ledger_balanced' | 'idempotency_key' | 'two_step_signing';
export declare const PREFLIGHT_ORDER: readonly PreflightCheckName[];
/**
 * Preflight profile for SELF-SERVICE user withdrawals. These are not operator
 * dual-control deal payouts, so the `two_step_signing` (two distinct approvers)
 * check does not apply — the account holder is the sole authorizer, already
 * gated by JWT auth, the 24h wallet-change hold, and the withdrawal allowlist.
 * Every other check (allowlist, idempotency key, operator cap, gas reserve, …)
 * is still enforced exactly as for deal payouts.
 */
export declare const WITHDRAWAL_PREFLIGHT_ORDER: readonly PreflightCheckName[];
export interface PreflightContext {
    dealStatusEligible: boolean;
    hasOpenDispute: boolean;
    hasLegalHold: boolean;
    address: string | null;
    chainSupported: boolean;
    isToken: boolean;
    tokenContractAllowlisted: boolean;
    amountSmallestUnit: bigint;
    snapshotPayoutSmallestUnit: bigint;
    gasReserveOk: boolean;
    operatorCapRemainingSmallestUnit: bigint;
    allowlistActiveFrom: string | null;
    hasPendingWalletChangeHold: boolean;
    nowIso: string;
    ledgerBalanced: boolean;
    idempotencyKey: string | null;
    approverIds: readonly string[];
}
export interface PreflightCheckResult {
    check: PreflightCheckName;
    passed: boolean;
    message: string;
}
export interface PreflightResult {
    authorized: boolean;
    failedCheck: PreflightCheckName | null;
    results: PreflightCheckResult[];
}
/**
 * Run the ordered preflight. Returns authorized=true only when all checks pass;
 * otherwise authorized=false and failedCheck names the first failure. An
 * optional `order` selects a preflight profile (defaults to the full payout
 * order; self-service withdrawals pass `WITHDRAWAL_PREFLIGHT_ORDER`).
 */
export declare function runPreflight(ctx: PreflightContext, order?: readonly PreflightCheckName[]): PreflightResult;
//# sourceMappingURL=payout-preflight.d.ts.map