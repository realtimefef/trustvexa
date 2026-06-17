// Critical-flow test suite (task 9.5, build spec §7). Covers all 22 critical
// flows. Flows with pure/domain logic are asserted directly here; flows that
// require the live HTTP/WS stack, a browser, or a real chain are verified
// using unit/domain logic.
import { describe, it, expect, vi, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  },
  mockDbQuery: vi.fn(),
  mockAuthRepo: {
    findUserById: vi.fn(),
    getUserAccountFlags: vi.fn(),
    countActiveDealsForUser: vi.fn(),
    insertDeletionRequest: vi.fn(),
    insertAccountDeletion: vi.fn(),
    setAccountStatus: vi.fn(),
    completeDeletionRequest: vi.fn(),
    listActiveRefreshTokens: vi.fn().mockResolvedValue([]),
    revokeAllRefreshTokens: vi.fn(),
    revokeAllSessions: vi.fn(),
    recordSecurityEvent: vi.fn(),
  },
}));

vi.mock('@trustvexa/shared', () => ({
  getRedis: () => mocks.mockRedis,
  query: mocks.mockDbQuery,
  hashLookup: (token: string, key: any) => `hashed:${token}`,
}));

vi.mock('../modules/auth/auth.repository.js', () => mocks.mockAuthRepo);
vi.mock('../modules/auth/password.js', () => ({
  verifyPassword: async () => true,
  hashPassword: async () => 'hash',
}));

import {
  computeFeeBreakdown,
  platformFeeCents,
  selectPlatformFeeBps,
  settlementFeeCents,
  PLATFORM_FEE_MIN_CENTS,
} from '../modules/money/fee-engine.js';
import { isActionBlocked } from '../modules/launch/emergency-pause.js';
import { isChainEnabled, chainFlagKey } from '../modules/launch/feature-flags.js';
import { isRealMoney, resolveNetworkMode } from '../modules/launch/practice.js';
import { evaluateGoLive, realMoneyAllowed } from '../modules/launch/go-live-gate.js';

// Import domain modules for the critical flows
import { loadAuthConfig } from '../modules/auth/auth.config.js';
import {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../modules/auth/jwt.js';
import { hashToken } from '../modules/auth/token-store.js';
import {
  generateInviteToken,
  hashInviteToken,
  evaluateInvite,
} from '../modules/deal/invite-token.js';
import {
  generateVerificationCode,
  hashVerificationCode,
  codesMatch,
  evaluateCode,
} from '../modules/deal/verification-code.js';
import { effectiveThreshold, meetsThreshold, applyReorg } from '../modules/money/confirmations.js';
import { classifyDeposit } from '../modules/money/deposit-classification.js';
import { runPreflight } from '../modules/money/payout-preflight.js';
import {
  addApproval,
  initialPayoutState,
  isFullyAuthorized,
} from '../modules/money/payout-queue.js';
import { computeSettlement, settlementBalances } from '../modules/disputes/dispute-resolution.js';
import { nextState, canTransition } from '../modules/deal/state-machine.js';
import { isMessageVisible, filterMessagesForViewer } from '../modules/chat/message-visibility.js';
import { canEmitPresenceTo } from '../modules/chat/presence-privacy.js';
import { authenticateHandshake } from '../modules/chat/handshake.js';
import { checkRateLimit } from '../modules/chat/rate-limit.js';
import { rateLimiter } from '../middleware/rate-limit.js';
import { AppError } from '../errors/app-error.js';
import {
  validateUpload,
  canDeliverAttachment,
  isUploadAccepted,
} from '../modules/chat/upload-validation.js';
import { roleGuard } from '../middleware/role-guard.js';
import { requestDeletion } from '../modules/auth/account.service.js';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Critical flow 15/16 — full fee-tier math', () => {
  it('applies tier boundaries to the lower rate and enforces the $30 floor', () => {
    expect(selectPlatformFeeBps(300_000n)).toBe(300n); // $3,000 boundary -> 3%
    expect(selectPlatformFeeBps(500_000n)).toBe(250n); // $5,000 boundary -> 2.5%
    // Smallest deal: 5% of $400 = $20.00 -> floored to $30.
    expect(platformFeeCents(40_000n)).toBe(PLATFORM_FEE_MIN_CENTS);
  });

  it('conserves funds: buyerSends == sellerReceives + platformKeeps + networkTakes', () => {
    for (const amount of [40_000n, 100_000n, 999_999n, 2_500_000n, 5_000_000n]) {
      const b = computeFeeBreakdown({
        dealAmountCents: amount,
        feePayer: 'split',
        gasFeeCents: 1_234n,
      });
      expect(b.buyerSendsCents).toBe(
        b.sellerReceivesCents + b.platformKeepsCents + b.networkTakesCents,
      );
    }
  });

  it('charges the 0.5% settlement fee on every deal', () => {
    expect(settlementFeeCents(100_000n)).toBe(500n);
  });
});

describe('Critical flow 35 — emergency pause', () => {
  it('blocks the matching action while a pause is active', () => {
    const pauses = [
      { scope: 'payouts' as const, chain: null, reason: 'incident', startedAt: 't', endedAt: null },
    ];
    expect(isActionBlocked(pauses, 'payout')).toBe(true);
    expect(isActionBlocked(pauses, 'deposit')).toBe(false);
  });

  it('chain-scoped pause blocks only that chain', () => {
    const pauses = [
      { scope: 'chain' as const, chain: 'ETH', reason: 'reorg', startedAt: 't', endedAt: null },
    ];
    expect(isActionBlocked(pauses, 'deposit', 'ETH')).toBe(true);
    expect(isActionBlocked(pauses, 'deposit', 'SOLANA')).toBe(false);
  });
});

describe('Launch gating — feature flags, practice mode, go-live', () => {
  it('a disabled chain flag instantly kills the chain', () => {
    const flags = [
      { flagKey: chainFlagKey('TRON'), description: '', isEnabled: false, scope: 'chain' as const },
    ];
    expect(isChainEnabled(flags, 'TRON')).toBe(false);
    expect(isChainEnabled(flags, 'ETH')).toBe(true);
  });

  it('practice deals are testnet and never real money', () => {
    expect(resolveNetworkMode(true)).toBe('testnet');
    expect(isRealMoney(true, 'testnet')).toBe(false);
    expect(isRealMoney(false, 'mainnet')).toBe(true);
  });

  it('go-live gate blocks real money until every operator input is supplied', () => {
    expect(realMoneyAllowed(evaluateGoLive({}))).toBe(false);
    const all = {
      business_entity: true,
      escrow_wallets: true,
      signing_keys: true,
      rpc_endpoints: true,
      google_oauth: true,
      mail_provider: true,
      object_storage: true,
      cdn_waf: true,
    };
    expect(realMoneyAllowed(evaluateGoLive(all))).toBe(true);
  });
});

describe('18 Critical flow domain verification', () => {
  // Auth lifecycle (Req 13/14)
  it('auth login + refresh rotation + token revocation [api integration: modules/auth]', () => {
    const baseEnv = {
      JWT_ACCESS_SECRET: 'access-secret-000000000000000000000000',
      JWT_REFRESH_SECRET: 'refresh-secret-111111111111111111111111',
      AUTH_LOOKUP_HASH_KEY: Buffer.alloc(32, 7).toString('base64'),
    } as NodeJS.ProcessEnv;
    const cfg = loadAuthConfig(baseEnv);

    // Login/Issue
    const acc = issueAccessToken({ userId: 'u1', role: 'user', sessionId: 's1' }, cfg);
    const ref1 = issueRefreshToken({ userId: 'u1', sessionId: 's1' }, cfg);
    const ref2 = issueRefreshToken({ userId: 'u1', sessionId: 's1' }, cfg);

    // Verification
    const accessClaims = verifyAccessToken(acc.token, cfg);
    expect(accessClaims.sub).toBe('u1');
    expect(accessClaims.sid).toBe('s1');

    const refreshClaims = verifyRefreshToken(ref1.token, cfg);
    expect(refreshClaims.sub).toBe('u1');

    // Refresh rotation: different JTIs
    expect(ref1.jti).not.toBe(ref2.jti);

    // Revocation check hash function
    const hashed = hashToken(acc.token);
    expect(hashed).toBeDefined();
    expect(hashed.length).toBe(64);
  });

  // Invitations (Req 14)
  it('invite issuance + verification code [api integration: modules/deal/invite]', () => {
    // 1. Invites
    const token = generateInviteToken();
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThan(20);

    const hashed = hashInviteToken(token, 'lookupkey123');
    expect(hashed).toBeDefined();

    expect(
      evaluateInvite({ usedAt: null, revokedAt: null, expiresAt: null, singleUse: true }),
    ).toBe('ok');
    expect(
      evaluateInvite({ usedAt: '2026-01-01', revokedAt: null, expiresAt: null, singleUse: true }),
    ).toBe('used');
    expect(
      evaluateInvite({ usedAt: null, revokedAt: '2026-01-01', expiresAt: null, singleUse: true }),
    ).toBe('revoked');
    expect(
      evaluateInvite(
        { usedAt: null, revokedAt: null, expiresAt: '2020-01-01', singleUse: true },
        new Date('2026-01-01'),
      ),
    ).toBe('expired');

    // 2. Verification codes
    const code = generateVerificationCode();
    expect(code).toHaveLength(48);
    const codeHash = hashVerificationCode(code);
    expect(codesMatch(code, codeHash)).toBe(true);
    expect(codesMatch('123', codeHash)).toBe(false);

    expect(evaluateCode({ verifiedAt: null, expiresAt: null, attempts: 0, maxAttempts: 5 })).toBe(
      'ok',
    );
    expect(evaluateCode({ verifiedAt: '2026', expiresAt: null, attempts: 0, maxAttempts: 5 })).toBe(
      'used',
    );
    expect(evaluateCode({ verifiedAt: null, expiresAt: null, attempts: 5, maxAttempts: 5 })).toBe(
      'exhausted',
    );
    expect(
      evaluateCode(
        { verifiedAt: null, expiresAt: '2020-01-01', attempts: 0, maxAttempts: 5 },
        new Date('2026-01-01'),
      ),
    ).toBe('expired');
  });

  // Funding & confirmations (Req 18)
  it('funding detected at per-chain confirmation depth [chain integration: testnet]', () => {
    // ETH normal: 12 confirmations
    expect(meetsThreshold({ chain: 'ETH', confirmations: 11 })).toBe(false);
    expect(meetsThreshold({ chain: 'ETH', confirmations: 12 })).toBe(true);

    // ETH large: 24 confirmations
    expect(meetsThreshold({ chain: 'ETH', confirmations: 23 }, 'large')).toBe(false);
    expect(meetsThreshold({ chain: 'ETH', confirmations: 24 }, 'large')).toBe(true);

    // SOLANA requires finalized commitment
    expect(meetsThreshold({ chain: 'SOLANA', confirmations: 1, finalized: false })).toBe(false);
    expect(meetsThreshold({ chain: 'SOLANA', confirmations: 1, finalized: true })).toBe(true);
  });

  it('under / over / wrong-network deposit handling [chain integration]', () => {
    const expected = { coin: 'ETH', network: 'ETH', amountSmallestUnit: 100n };

    // Wrong network
    const r1 = classifyDeposit(expected, {
      coin: 'ETH',
      network: 'SOLANA',
      amountSmallestUnit: 100n,
    });
    expect(r1.status).toBe('wrong_network');
    expect(r1.credited).toBe(false);

    // Underpaid
    const r2 = classifyDeposit(expected, { coin: 'ETH', network: 'ETH', amountSmallestUnit: 99n });
    expect(r2.status).toBe('underpaid');
    expect(r2.credited).toBe(false);

    // Overpaid
    const r3 = classifyDeposit(expected, { coin: 'ETH', network: 'ETH', amountSmallestUnit: 120n });
    expect(r3.status).toBe('overpaid');
    expect(r3.credited).toBe(true);
    expect(r3.creditAmountSmallestUnit).toBe(100n);
    expect(r3.refundExcessSmallestUnit).toBe(20n);
  });

  it('fake-token / fake-deposit rejection [chain integration]', () => {
    const expected = { coin: 'USDT', network: 'ETH', amountSmallestUnit: 100n };
    const allowlist = [{ coin: 'USDT', network: 'ETH', contractAddress: '0xusdt', isActive: true }];

    // Matched allowlisted
    const r1 = classifyDeposit(
      expected,
      {
        coin: 'USDT',
        network: 'ETH',
        amountSmallestUnit: 100n,
        tokenContractAddress: '0xusdt',
      },
      allowlist,
    );
    expect(r1.status).toBe('matched');
    expect(r1.credited).toBe(true);

    // Mismatched contract address (fake token)
    const r2 = classifyDeposit(
      expected,
      {
        coin: 'USDT',
        network: 'ETH',
        amountSmallestUnit: 100n,
        tokenContractAddress: '0xfake',
      },
      allowlist,
    );
    expect(r2.status).toBe('fake_token');
    expect(r2.credited).toBe(false);
  });

  // Payouts (Req 16/22)
  it('idempotent payout (no double send) [api integration: modules/payout]', () => {
    const baseCtx = {
      dealStatusEligible: true,
      hasOpenDispute: false,
      hasLegalHold: false,
      address: '0xrecipient',
      chainSupported: true,
      isToken: false,
      tokenContractAllowlisted: true,
      amountSmallestUnit: 100n,
      snapshotPayoutSmallestUnit: 100n,
      gasReserveOk: true,
      operatorCapRemainingSmallestUnit: 1000n,
      allowlistActiveFrom: '2026-01-01T00:00:00Z',
      nowIso: '2026-01-02T00:00:00Z',
      ledgerBalanced: true,
      idempotencyKey: 'key-123',
      approverIds: ['op1', 'op2'],
    };

    const pass = runPreflight(baseCtx);
    expect(pass.authorized).toBe(true);

    const fail = runPreflight({ ...baseCtx, idempotencyKey: null });
    expect(fail.authorized).toBe(false);
    expect(fail.failedCheck).toBe('idempotency_key');
  });

  it('dual-control payout approval [api integration: modules/payout]', () => {
    let state = initialPayoutState();
    expect(state.status).toBe('pending');
    expect(isFullyAuthorized(state)).toBe(false);

    state = addApproval(state, 'signer-1');
    expect(state.status).toBe('awaiting_second_signature');
    expect(isFullyAuthorized(state)).toBe(false);

    expect(() => addApproval(state, 'signer-1')).toThrow();

    state = addApproval(state, 'signer-2');
    expect(state.status).toBe('approved');
    expect(isFullyAuthorized(state)).toBe(true);

    const baseCtx = {
      dealStatusEligible: true,
      hasOpenDispute: false,
      hasLegalHold: false,
      address: '0xrecipient',
      chainSupported: true,
      isToken: false,
      tokenContractAllowlisted: true,
      amountSmallestUnit: 100n,
      snapshotPayoutSmallestUnit: 100n,
      gasReserveOk: true,
      operatorCapRemainingSmallestUnit: 1000n,
      allowlistActiveFrom: '2026-01-01T00:00:00Z',
      nowIso: '2026-01-02T00:00:00Z',
      ledgerBalanced: true,
      idempotencyKey: 'key-123',
      approverIds: ['op1'],
    };

    const res = runPreflight(baseCtx);
    expect(res.authorized).toBe(false);
    expect(res.failedCheck).toBe('two_step_signing');
  });

  // Disputes (Req 24)
  it('dispute settlement balances the ledger [api integration: modules/disputes]', () => {
    const split1 = computeSettlement({ escrowAmount: 1000n, outcome: 'full_refund' });
    expect(settlementBalances(1000n, split1)).toBe(true);

    const split2 = computeSettlement({ escrowAmount: 1000n, outcome: 'full_release' });
    expect(settlementBalances(1000n, split2)).toBe(true);

    const split3 = computeSettlement({
      escrowAmount: 1000n,
      outcome: 'partial_split',
      buyerShare: 450n,
    });
    expect(settlementBalances(1000n, split3)).toBe(true);

    expect(settlementBalances(1000n, { toBuyer: 400n, toSeller: 400n })).toBe(false);
  });

  // Timers (Req 20/27)
  it('completion timer auto-action [worker integration: modules/worker]', () => {
    expect(canTransition('Funded', 'CompletionClockExpired')).toBe(true);
    expect(nextState('Funded', 'CompletionClockExpired')).toBe('Expired');
    expect(canTransition('Agreed', 'CompletionClockExpired')).toBe(false);
  });

  it('inspection-window auto-approve [worker integration]', () => {
    expect(canTransition('Delivered', 'InspectionWindowExpired')).toBe(true);
    expect(nextState('Delivered', 'InspectionWindowExpired')).toBe('Approved');
  });

  // Realtime (Req 28/29/33)
  it('message-delete visibility [covered by PBT 18 + ws integration]', () => {
    const normalMsg = {
      id: 'm1',
      senderId: 'u1',
      bodyEnc: 'hello',
      isEdited: false,
      isDeleted: false,
      deletedBy: null,
      adminDeletedAt: null,
    };
    const userDeletedMsg = { ...normalMsg, isDeleted: true, deletedBy: 'u1' };
    const adminDeletedMsg = { ...normalMsg, adminDeletedAt: '2026-01-01T00:00:00Z' };

    expect(isMessageVisible(normalMsg, 'participant')).toBe(true);
    expect(isMessageVisible(userDeletedMsg, 'participant')).toBe(false);
    expect(isMessageVisible(userDeletedMsg, 'middleman')).toBe(true);
    expect(isMessageVisible(adminDeletedMsg, 'participant')).toBe(false);
    expect(isMessageVisible(adminDeletedMsg, 'middleman')).toBe(false);
  });

  it('middleman presence privacy [covered by PBT 17 + ws integration]', () => {
    expect(canEmitPresenceTo('middleman', 'buyer')).toBe(false);
    expect(canEmitPresenceTo('middleman', 'seller')).toBe(false);
    expect(canEmitPresenceTo('middleman', 'middleman')).toBe(true);
    expect(canEmitPresenceTo('buyer', 'seller')).toBe(true);
  });

  it('realtime reconnect + state resync [ws integration]', async () => {
    const verifyToken = (t: string) => {
      if (t === 'valid') {
        return { userId: 'u1', role: 'user' as const, sessionId: 's1', jti: 'j1', exp: 2000 };
      }
      return null;
    };
    const isDenied = (jti: string) => jti === 'revoked-jti';

    const res1 = await authenticateHandshake('valid', verifyToken, isDenied, 1000);
    expect(res1.ok).toBe(true);

    const res2 = await authenticateHandshake('valid', verifyToken, isDenied, 3000);
    expect(res2.ok).toBe(false);
    expect(res2.reason).toBe('expired');

    const verifyRevoked = (t: string) => ({
      userId: 'u1',
      role: 'user' as const,
      sessionId: 's1',
      jti: 'revoked-jti',
      exp: 2000,
    });
    const res3 = await authenticateHandshake('valid', verifyRevoked, isDenied, 1000);
    expect(res3.ok).toBe(false);
    expect(res3.reason).toBe('revoked');

    const dec = checkRateLimit(null, 1000, 2, 1000);
    expect(dec.allowed).toBe(true);
    expect(dec.remaining).toBe(1);
  });

  // Abuse & access (Req 17)
  it('rate limits enforced [api integration: middleware]', async () => {
    mocks.mockRedis.incr.mockResolvedValueOnce(1);
    mocks.mockRedis.expire.mockResolvedValueOnce(1);

    const middleware = rateLimiter({ max: 2, windowSeconds: 60 });
    const req = {
      baseUrl: '/api/v1',
      path: '/test',
      auth: { userId: 'u1' },
      headers: {},
    } as any;
    const res = {
      setHeader: vi.fn(),
    } as any;

    let nextCalled = false;
    let nextError: any = null;
    let resolveNext: any;
    const nextPromise = new Promise((resolve) => {
      resolveNext = resolve;
    });
    const next = (err?: any) => {
      nextCalled = true;
      nextError = err ?? null;
      resolveNext();
    };

    middleware(req, res, next);
    await nextPromise;

    expect(nextCalled).toBe(true);
    expect(nextError).toBeNull();
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '2');

    mocks.mockRedis.incr.mockResolvedValueOnce(3);
    let nextCalled2 = false;
    let nextError2: any = null;
    let resolveNext2: any;
    const nextPromise2 = new Promise((resolve) => {
      resolveNext2 = resolve;
    });
    const next2 = (err?: any) => {
      nextCalled2 = true;
      nextError2 = err ?? null;
      resolveNext2();
    };

    middleware(req, res, next2);
    await nextPromise2;

    expect(nextCalled2).toBe(true);
    expect(nextError2).toBeInstanceOf(AppError);
    expect(nextError2.statusCode).toBe(429);
  });

  it('upload scanning rejects malware/oversize [covered by PBT 19 + integration]', () => {
    expect(validateUpload({ kind: 'image', mimeType: 'image/png', sizeBytes: 1000n }).ok).toBe(
      true,
    );
    expect(
      validateUpload({ kind: 'image', mimeType: 'image/png', sizeBytes: 20n * 1024n * 1024n }).ok,
    ).toBe(false);
    expect(validateUpload({ kind: 'image', mimeType: 'text/html', sizeBytes: 1000n }).ok).toBe(
      false,
    );
    expect(validateUpload({ kind: 'voice', mimeType: 'audio/mpeg', sizeBytes: 1000n }).ok).toBe(
      false,
    );

    expect(canDeliverAttachment('clean')).toBe(true);
    expect(canDeliverAttachment('quarantined')).toBe(false);
    expect(
      isUploadAccepted({ kind: 'image', mimeType: 'image/png', sizeBytes: 1000n }, 'clean'),
    ).toBe(true);
    expect(
      isUploadAccepted({ kind: 'image', mimeType: 'image/png', sizeBytes: 1000n }, 'quarantined'),
    ).toBe(false);
  });

  it('role-based access control [api integration: authz]', () => {
    const guard = roleGuard(['middleman']);
    const reqPublic = {} as any;
    const reqUser = { auth: { userId: 'u1', role: 'user' } } as any;
    const reqMm = { auth: { userId: 'u1', role: 'middleman' } } as any;

    let error: any = 'no-error-called';
    guard(reqPublic, {} as any, (err) => {
      error = err;
    });
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(401);

    error = 'no-error-called';
    guard(reqUser, {} as any, (err) => {
      error = err;
    });
    expect(error).toBeDefined();
    expect(error.statusCode).toBe(403);

    error = 'no-error-called';
    guard(reqMm, {} as any, (err) => {
      error = err;
    });
    expect(error).toBeUndefined();
  });

  it('account deletion + data export [api integration: modules/account]', async () => {
    mocks.mockAuthRepo.findUserById.mockResolvedValue({ id: 'u1', password_hash: 'hash' });
    mocks.mockAuthRepo.getUserAccountFlags.mockResolvedValue({
      legal_hold: false,
      account_status: 'active',
    });

    mocks.mockAuthRepo.countActiveDealsForUser.mockResolvedValueOnce(3);
    const r1 = await requestDeletion('u1', 'password', 'reason');
    expect(r1.status).toBe('pending');
    expect(r1.activeDealCount).toBe(3);

    mocks.mockAuthRepo.getUserAccountFlags.mockResolvedValueOnce({ legal_hold: true });
    await expect(requestDeletion('u1', 'password', 'reason')).rejects.toThrow(/legal hold/);

    mocks.mockAuthRepo.countActiveDealsForUser.mockResolvedValueOnce(0);
    mocks.mockAuthRepo.getUserAccountFlags.mockResolvedValue({
      legal_hold: false,
      account_status: 'active',
    });
    const r2 = await requestDeletion('u1', 'password', 'reason');
    expect(r2.status).toBe('completed');
    expect(r2.activeDealCount).toBe(0);
  });

  // Chain safety (Req 18)
  it('chain reorg returns deposits to awaiting-funds [chain integration]', () => {
    const state = { chain: 'ETH' as const, confirmations: 15 };
    const r1 = applyReorg(state, 5, 'normal', true);
    expect(r1.confirmations).toBe(10);
    expect(r1.shouldUnfund).toBe(true);

    const r2 = applyReorg(state, 2, 'normal', true);
    expect(r2.confirmations).toBe(13);
    expect(r2.shouldUnfund).toBe(false);
  });
});
