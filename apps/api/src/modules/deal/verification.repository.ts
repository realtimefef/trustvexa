/**
 * Data access for 48-digit verification codes (task 4.5, Requirement 10).
 *
 * Only the SHA-256 hash of a code is stored (`code_hash`). Attempt counting is
 * a standalone (auto-committed) UPDATE so every attempt is logged even when the
 * surrounding request later fails (Requirement 10.6). `markVerified` is a
 * conditional UPDATE so a code can be consumed at most once (Requirement 10.4).
 * All SQL is parameterized.
 */
import { query } from '@trustvexa/shared';

export interface DealPartiesRow {
  id: string;
  status: string;
  buyer_id: string | null;
  seller_id: string | null;
}

export async function loadDealParties(dealId: string): Promise<DealPartiesRow | null> {
  const res = await query<DealPartiesRow>(
    `SELECT id, status, buyer_id, seller_id FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface VerificationCodeRow {
  id: string;
  code_hash: string;
  expires_at: string | null;
  verified_at: string | null;
  attempts: number;
}

/** Expire any still-active codes for a deal before issuing a fresh one. */
export async function expireActiveCodes(dealId: string): Promise<void> {
  await query(
    `UPDATE verification_codes SET expires_at = now()
      WHERE deal_id = $1 AND verified_at IS NULL AND (expires_at IS NULL OR expires_at > now())`,
    [dealId],
  );
}

export async function insertVerificationCode(
  dealId: string,
  codeHash: string,
  expiresAt: string,
): Promise<{ id: string }> {
  const res = await query<{ id: string }>(
    `INSERT INTO verification_codes (deal_id, code_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [dealId, codeHash, expiresAt],
  );
  return res.rows[0] as { id: string };
}

/** Most recently issued code for a deal (null when none requested yet). */
export async function getLatestCode(dealId: string): Promise<VerificationCodeRow | null> {
  const res = await query<VerificationCodeRow>(
    `SELECT id, code_hash, expires_at, verified_at, attempts
       FROM verification_codes WHERE deal_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

/** Increment the attempt counter (logs every attempt). Returns the new count. */
export async function incrementAttempts(codeId: string): Promise<number> {
  const res = await query<{ attempts: number }>(
    `UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
    [codeId],
  );
  return res.rows[0]?.attempts ?? 0;
}

/** Mark a code verified iff still unverified. True only if THIS call won. */
export async function markVerified(codeId: string): Promise<boolean> {
  const res = await query(
    `UPDATE verification_codes SET verified_at = now() WHERE id = $1 AND verified_at IS NULL`,
    [codeId],
  );
  return (res.rowCount ?? 0) > 0;
}
