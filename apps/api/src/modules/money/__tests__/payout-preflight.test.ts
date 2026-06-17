// Feature: trustvexa-escrow-platform, Property 14: A payout broadcasts only when fully authorized
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PREFLIGHT_ORDER, runPreflight, type PreflightContext } from '../payout-preflight.js';
import { addApproval, initialPayoutState, isFullyAuthorized } from '../payout-queue.js';

const passingContext = (): PreflightContext => ({
  dealStatusEligible: true,
  hasOpenDispute: false,
  hasLegalHold: false,
  address: '0x1111111111111111111111111111111111111111',
  chainSupported: true,
  isToken: false,
  tokenContractAllowlisted: false,
  amountSmallestUnit: 1000n,
  snapshotPayoutSmallestUnit: 1000n,
  gasReserveOk: true,
  operatorCapRemainingSmallestUnit: 10_000n,
  allowlistActiveFrom: '2020-01-01T00:00:00.000Z',
  hasPendingWalletChangeHold: false,
  nowIso: '2026-01-01T00:00:00.000Z',
  ledgerBalanced: true,
  idempotencyKey: 'key-1',
  approverIds: ['signer-a', 'signer-b'],
});

describe('Property 14: a payout broadcasts only when fully authorized', () => {
  it('authorizes when every check passes', () => {
    expect(runPreflight(passingContext()).authorized).toBe(true);
  });

  it('any single failing check blocks authorization and is named', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PREFLIGHT_ORDER), (toBreak) => {
        const ctx = passingContext();
        switch (toBreak) {
          case 'deal_status':
            ctx.dealStatusEligible = false;
            break;
          case 'no_dispute_or_legal_hold':
            ctx.hasOpenDispute = true;
            break;
          case 'address_present':
            ctx.address = null;
            break;
          case 'chain_supported':
            ctx.chainSupported = false;
            break;
          case 'token_contract_allowlisted':
            ctx.isToken = true;
            ctx.tokenContractAllowlisted = false;
            break;
          case 'amount_matches_snapshot':
            ctx.amountSmallestUnit = 999n;
            break;
          case 'gas_reserve':
            ctx.gasReserveOk = false;
            break;
          case 'operator_daily_cap':
            ctx.operatorCapRemainingSmallestUnit = 0n;
            break;
          case 'withdrawal_allowlist':
            ctx.allowlistActiveFrom = null;
            break;
          case 'ledger_balanced':
            ctx.ledgerBalanced = false;
            break;
          case 'idempotency_key':
            ctx.idempotencyKey = null;
            break;
          case 'two_step_signing':
            ctx.approverIds = ['signer-a'];
            break;
        }
        const result = runPreflight(ctx);
        expect(result.authorized).toBe(false);
        // The first failing check in canonical order is reported.
        const expectedFirst = PREFLIGHT_ORDER.find(
          (c) => !runPreflight(ctx).results.find((r) => r.check === c)?.passed,
        );
        expect(result.failedCheck).toBe(expectedFirst);
      }),
    );
  });

  it('time-delayed allowlist entry is not yet usable', () => {
    const ctx = passingContext();
    ctx.allowlistActiveFrom = '2030-01-01T00:00:00.000Z';
    const result = runPreflight(ctx);
    expect(result.authorized).toBe(false);
    expect(result.failedCheck).toBe('withdrawal_allowlist');
  });

  it('withdrawal allowlist is blocked by active pending wallet change hold', () => {
    const ctx = passingContext();
    ctx.hasPendingWalletChangeHold = true;
    const result = runPreflight(ctx);
    expect(result.authorized).toBe(false);
    expect(result.failedCheck).toBe('withdrawal_allowlist');
    expect(result.results.find((r) => r.check === 'withdrawal_allowlist')?.message).toBe(
      'address has active pending wallet change hold',
    );
  });

  it('requires two distinct signatures before it is fully authorized', () => {
    let state = initialPayoutState();
    state = addApproval(state, 'signer-a');
    expect(isFullyAuthorized(state)).toBe(false);
    state = addApproval(state, 'signer-b');
    expect(isFullyAuthorized(state)).toBe(true);
    expect(() => addApproval(initialPayoutState(), 'x')).not.toThrow();
  });
});
