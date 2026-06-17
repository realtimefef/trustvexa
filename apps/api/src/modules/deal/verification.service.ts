/**
 * 48-digit verification-code service (task 4.5, Requirements 10.1-10.6).
 *
 *  - requestVerificationCode: the buyer mints a code with an expiry; any prior
 *    active code is invalidated so only the newest is valid. The plaintext code
 *    is returned exactly once; only its hash is stored (10.1, 10.2).
 *  - submitVerificationCode: the seller enters the code. EVERY attempt is
 *    logged (10.6); used / expired / exhausted / incorrect codes are rejected
 *    (10.5); a correct, valid code is consumed once (10.4) and advances the
 *    deal Agreed -> Verified, marking both sides verified (10.3).
 *
 * Per-request rate limiting is enforced by the rate-limit middleware on the
 * verify route; this service additionally caps attempts per code.
 */
import { AppError } from '../../errors/app-error.js';

import { getDealConfig } from './deal.config.js';
import { applyDealTransition } from './deal.service.js';
import {
  codesMatch,
  evaluateCode,
  generateVerificationCode,
  hashVerificationCode,
  type CodeUsability,
} from './verification-code.js';
import {
  expireActiveCodes,
  getLatestCode,
  incrementAttempts,
  insertVerificationCode,
  loadDealParties,
  markVerified,
} from './verification.repository.js';

export interface IssuedCode {
  code: string;
  expiresAt: string;
}

export async function requestVerificationCode(args: {
  dealId: string;
  requesterId: string;
}): Promise<IssuedCode> {
  const cfg = getDealConfig();
  const deal = await loadDealParties(args.dealId);
  if (deal === null) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }
  // Requirement 10.1: the buyer requests verification.
  if (deal.buyer_id !== args.requesterId) {
    throw new AppError('not_deal_buyer', 'Only the buyer can request a verification code.', 403);
  }
  if (deal.status !== 'Agreed') {
    throw new AppError(
      'verification_not_allowed',
      `Verification can only be requested while the deal is Agreed (currently ${deal.status}).`,
      409,
    );
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + cfg.verificationCodeTtlMinutes * 60000).toISOString();
  await expireActiveCodes(args.dealId);
  await insertVerificationCode(args.dealId, hashVerificationCode(code), expiresAt);

  return { code, expiresAt };
}

export interface VerifyResult {
  dealId: string;
  status: string;
}

export async function submitVerificationCode(args: {
  dealId: string;
  submitterId: string;
  code: string;
}): Promise<VerifyResult> {
  const cfg = getDealConfig();
  const deal = await loadDealParties(args.dealId);
  if (deal === null) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }
  // Requirement 10.3: the seller enters the code.
  if (deal.seller_id !== args.submitterId) {
    throw new AppError('not_deal_seller', 'Only the seller can submit the verification code.', 403);
  }

  const row = await getLatestCode(args.dealId);
  if (row === null) {
    throw new AppError(
      'no_active_code',
      'No verification code has been requested for this deal.',
      404,
    );
  }

  // Reject used / expired / exhausted before spending an attempt.
  rejectUnusableCode(
    evaluateCode({
      verifiedAt: row.verified_at,
      expiresAt: row.expires_at,
      attempts: row.attempts,
      maxAttempts: cfg.maxVerificationAttempts,
    }),
  );

  // Requirement 10.6: log EVERY attempt (persists even when the rest fails).
  const attempts = await incrementAttempts(row.id);
  if (attempts > cfg.maxVerificationAttempts) {
    throw new AppError(
      'too_many_attempts',
      'Too many verification attempts. Request a new code.',
      429,
    );
  }

  if (!codesMatch(args.code, row.code_hash)) {
    throw new AppError('invalid_code', 'The verification code is incorrect.', 400);
  }

  // Correct + valid: consume once (10.4), then advance Agreed -> Verified (10.3).
  const verified = await markVerified(row.id);
  if (!verified) {
    throw new AppError('code_already_used', 'This verification code was already used.', 409);
  }
  const result = await applyDealTransition({
    dealId: args.dealId,
    event: 'CodeVerified',
    actorId: args.submitterId,
    requestId: row.id,
  });

  return { dealId: args.dealId, status: result.to };
}

function rejectUnusableCode(usability: CodeUsability): void {
  if (usability === 'ok') {
    return;
  }
  const map: Record<Exclude<CodeUsability, 'ok'>, readonly [string, string, number]> = {
    used: ['code_already_used', 'This verification code was already used.', 409],
    expired: ['code_expired', 'This verification code has expired.', 410],
    exhausted: ['too_many_attempts', 'Too many verification attempts. Request a new code.', 429],
  };
  const [code, msg, status] = map[usability];
  throw new AppError(code, msg, status);
}
