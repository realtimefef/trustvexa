// Payout/refund preflight authorization (tasks 5.23, 5.24).
// A payout is authorized only when EVERY ordered check passes. The checks run
// in a fixed order and stop at the first failure, naming the failed check so
// the operator sees exactly why a broadcast is blocked (Property 14).
// (Requirements 22.3, 22.4, 22.5, 22.6, 22.7, 22.8)

export type PreflightCheckName =
  | 'deal_status'
  | 'no_dispute_or_legal_hold'
  | 'address_present'
  | 'chain_supported'
  | 'token_contract_allowlisted'
  | 'amount_matches_snapshot'
  | 'gas_reserve'
  | 'operator_daily_cap'
  | 'withdrawal_allowlist'
  | 'ledger_balanced'
  | 'idempotency_key'
  | 'two_step_signing';

export const PREFLIGHT_ORDER: readonly PreflightCheckName[] = [
  'deal_status',
  'no_dispute_or_legal_hold',
  'address_present',
  'chain_supported',
  'token_contract_allowlisted',
  'amount_matches_snapshot',
  'gas_reserve',
  'operator_daily_cap',
  'withdrawal_allowlist',
  'ledger_balanced',
  'idempotency_key',
  'two_step_signing',
];

/**
 * Preflight profile for SELF-SERVICE user withdrawals. These are not operator
 * dual-control deal payouts, so the `two_step_signing` (two distinct approvers)
 * check does not apply — the account holder is the sole authorizer, already
 * gated by JWT auth, the 24h wallet-change hold, and the withdrawal allowlist.
 * Every other check (allowlist, idempotency key, operator cap, gas reserve, …)
 * is still enforced exactly as for deal payouts.
 */
export const WITHDRAWAL_PREFLIGHT_ORDER: readonly PreflightCheckName[] =
  PREFLIGHT_ORDER.filter((c) => c !== 'two_step_signing');

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
  allowlistActiveFrom: string | null; // ISO; null when the address is not allowlisted
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

function distinct(ids: readonly string[]): number {
  return new Set(ids).size;
}

function evaluate(check: PreflightCheckName, ctx: PreflightContext): PreflightCheckResult {
  switch (check) {
    case 'deal_status':
      return {
        check,
        passed: ctx.dealStatusEligible,
        message: ctx.dealStatusEligible ? 'deal status eligible' : 'deal is not in a payable state',
      };
    case 'no_dispute_or_legal_hold':
      return {
        check,
        passed: !ctx.hasOpenDispute && !ctx.hasLegalHold,
        message: ctx.hasOpenDispute
          ? 'an open dispute blocks payout'
          : ctx.hasLegalHold
            ? 'a legal hold blocks payout'
            : 'no dispute or legal hold',
      };
    case 'address_present':
      return {
        check,
        passed: !!ctx.address,
        message: ctx.address ? 'payout address present' : 'no payout address',
      };
    case 'chain_supported':
      return {
        check,
        passed: ctx.chainSupported,
        message: ctx.chainSupported ? 'chain supported' : 'unsupported chain',
      };
    case 'token_contract_allowlisted':
      return {
        check,
        passed: !ctx.isToken || ctx.tokenContractAllowlisted,
        message:
          !ctx.isToken || ctx.tokenContractAllowlisted
            ? 'token contract ok'
            : 'token contract not on allowlist',
      };
    case 'amount_matches_snapshot':
      return {
        check,
        passed:
          ctx.amountSmallestUnit > 0n && ctx.amountSmallestUnit === ctx.snapshotPayoutSmallestUnit,
        message:
          ctx.amountSmallestUnit === ctx.snapshotPayoutSmallestUnit
            ? 'amount matches funding snapshot'
            : 'amount does not match funding snapshot',
      };
    case 'gas_reserve':
      return {
        check,
        passed: ctx.gasReserveOk,
        message: ctx.gasReserveOk ? 'gas reserve sufficient' : 'gas reserve too low',
      };
    case 'operator_daily_cap':
      return {
        check,
        passed: ctx.amountSmallestUnit <= ctx.operatorCapRemainingSmallestUnit,
        message:
          ctx.amountSmallestUnit <= ctx.operatorCapRemainingSmallestUnit
            ? 'within operator daily cap'
            : 'exceeds operator daily cap',
      };
    case 'withdrawal_allowlist': {
      const active =
        ctx.allowlistActiveFrom !== null &&
        Date.parse(ctx.allowlistActiveFrom) <= Date.parse(ctx.nowIso);
      const passed = active && !ctx.hasPendingWalletChangeHold;
      return {
        check,
        passed,
        message:
          ctx.allowlistActiveFrom === null
            ? 'address not on withdrawal allowlist'
            : ctx.hasPendingWalletChangeHold
              ? 'address has active pending wallet change hold'
              : active
                ? 'allowlisted and time-delay elapsed'
                : 'allowlist time-delay not yet elapsed',
      };
    }
    case 'ledger_balanced':
      return {
        check,
        passed: ctx.ledgerBalanced,
        message: ctx.ledgerBalanced ? 'ledger balanced' : 'ledger not balanced',
      };
    case 'idempotency_key':
      return {
        check,
        passed: !!ctx.idempotencyKey && ctx.idempotencyKey.trim().length > 0,
        message: ctx.idempotencyKey ? 'idempotency key present' : 'missing idempotency key',
      };
    case 'two_step_signing':
      return {
        check,
        passed: distinct(ctx.approverIds) >= 2,
        message:
          distinct(ctx.approverIds) >= 2
            ? 'two distinct approvers'
            : 'requires two distinct approvers',
      };
  }
}

/**
 * Run the ordered preflight. Returns authorized=true only when all checks pass;
 * otherwise authorized=false and failedCheck names the first failure. An
 * optional `order` selects a preflight profile (defaults to the full payout
 * order; self-service withdrawals pass `WITHDRAWAL_PREFLIGHT_ORDER`).
 */
export function runPreflight(
  ctx: PreflightContext,
  order: readonly PreflightCheckName[] = PREFLIGHT_ORDER,
): PreflightResult {
  const results: PreflightCheckResult[] = [];
  let failedCheck: PreflightCheckName | null = null;
  for (const name of order) {
    const result = evaluate(name, ctx);
    results.push(result);
    if (!result.passed) {
      failedCheck = name;
      break;
    }
  }
  return { authorized: failedCheck === null, failedCheck, results };
}
