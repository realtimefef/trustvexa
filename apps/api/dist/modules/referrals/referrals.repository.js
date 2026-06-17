/**
 * Persistence for the referral program (Build Spec §3 "Support / misc").
 *
 * All reads/writes are scoped by `referrer_user_id` (the JWT user id), so a
 * caller only ever sees their own referrals. The caller's own shareable code is
 * modelled as the "holder" row — their referral row with no invited email
 * (`invited_email_hash IS NULL`). Get-or-create of that holder row runs inside a
 * transaction so it is idempotent. Real columns from the migration are used
 * verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';
/** Find the caller's self-issued referral code holder row, if any. */
export async function findOwnCode(tx, userId) {
    const { rows } = await tx.query(`SELECT id, code, invited_email_hash, status, created_at
       FROM referrals
      WHERE referrer_user_id = $1 AND invited_email_hash IS NULL
      ORDER BY created_at ASC
      LIMIT 1`, [userId]);
    return rows[0] ?? null;
}
/** Insert the caller's self-issued referral code holder row. */
export async function insertOwnCode(tx, input) {
    const { rows } = await tx.query(`INSERT INTO referrals (referrer_user_id, invited_email_hash, code, status)
     VALUES ($1, NULL, $2, $3)
     RETURNING id, code, invited_email_hash, status, created_at`, [input.userId, input.code, input.status]);
    const row = rows[0];
    if (!row)
        throw new Error('insertOwnCode returned no row');
    return row;
}
/** List all of the caller's referral rows, newest first. */
export async function listReferralsForUser(userId) {
    const res = await query(`SELECT id, code, invited_email_hash, status, created_at
       FROM referrals
      WHERE referrer_user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`, [userId]);
    return res.rows;
}
//# sourceMappingURL=referrals.repository.js.map