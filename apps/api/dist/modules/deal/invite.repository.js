/**
 * Data access for secure seller invites (task 4.3, Requirements 8.1-8.5).
 *
 * Tokens are stored only as HMAC hashes (`token_hash`, unique). Single-use and
 * revocation are enforced atomically in SQL: the "consume" update only matches
 * an invite that is still unused, unrevoked, and unexpired, so two concurrent
 * accepts can never both win. All SQL is parameterized.
 */
import { query } from '@trustvexa/shared';
export async function insertInvite(client, params) {
    const res = await client.query(`INSERT INTO deal_invites
       (deal_id, token_hash, intended_user_hint, single_use, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`, [params.dealId, params.tokenHash, params.intendedUserHint, params.singleUse, params.expiresAt]);
    return res.rows[0];
}
export async function getInviteByTokenHash(tokenHash) {
    const res = await query(`SELECT id, deal_id, single_use, expires_at, used_at, revoked_at
       FROM deal_invites WHERE token_hash = $1 LIMIT 1`, [tokenHash]);
    return res.rows[0] ?? null;
}
/**
 * Atomically consume a single-use invite. Returns true only if THIS call
 * flipped it from unused -> used; a second concurrent call matches 0 rows.
 */
export async function consumeInvite(client, inviteId) {
    const res = await client.query(`UPDATE deal_invites
        SET used_at = now()
      WHERE id = $1
        AND revoked_at IS NULL
        AND (single_use = false OR used_at IS NULL)
        AND (expires_at IS NULL OR expires_at > now())`, [inviteId]);
    return (res.rowCount ?? 0) > 0;
}
/** Revoke an invite, scoped to the deal's owner. Returns true if revoked. */
export async function revokeInvite(inviteId, sellerId, reason) {
    const res = await query(`UPDATE deal_invites di
        SET revoked_at = now(), revoked_by = $2, revoke_reason = $3
       FROM deals d
      WHERE di.id = $1
        AND di.deal_id = d.id
        AND d.seller_id = $2
        AND di.revoked_at IS NULL
        AND di.used_at IS NULL`, [inviteId, sellerId, reason]);
    return (res.rowCount ?? 0) > 0;
}
export async function listInvitesForDeal(dealId, sellerId) {
    const res = await query(`SELECT di.id, di.intended_user_hint, di.single_use, di.expires_at,
            di.used_at, di.revoked_at, di.created_at
       FROM deal_invites di
       JOIN deals d ON d.id = di.deal_id
      WHERE di.deal_id = $1 AND d.seller_id = $2
      ORDER BY di.created_at DESC`, [dealId, sellerId]);
    return res.rows;
}
/** Load a deal scoped to its owning seller (null if not found / not owned). */
export async function loadOwnedDeal(client, dealId, sellerId) {
    const res = await client.query(`SELECT id, status, seller_id, buyer_id, coin, network, deal_amount
       FROM deals WHERE id = $1 AND seller_id = $2 LIMIT 1`, [dealId, sellerId]);
    return res.rows[0] ?? null;
}
/** Load minimal deal facts for an invite recipient (no owner scope). */
export async function loadDealForRecipient(dealId) {
    const res = await query(`SELECT id, status, seller_id, buyer_id, coin, network, deal_amount
       FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
/**
 * Atomically attach a buyer to a deal that has no buyer yet. Returns true only
 * if THIS call set the buyer (prevents two recipients claiming one deal, and
 * blocks the seller from joining their own deal).
 */
export async function attachBuyer(client, dealId, buyerId) {
    const res = await client.query(`UPDATE deals
        SET buyer_id = $2, updated_at = now()
      WHERE id = $1 AND buyer_id IS NULL AND seller_id <> $2`, [dealId, buyerId]);
    return (res.rowCount ?? 0) > 0;
}
export async function insertInviteSafetySnapshot(client, snap) {
    await client.query(`INSERT INTO invite_safety_snapshots
       (invite_id, counterparty_user_id, account_label, completed_deals_count,
        dispute_rate_band, risk_warning)
     VALUES ($1, $2, $3, $4, $5, $6)`, [
        snap.inviteId,
        snap.counterpartyUserId,
        snap.accountLabel,
        snap.completedDealsCount,
        snap.disputeRateBand,
        snap.riskWarning,
    ]);
}
/** Snapshot stats of a user shown to an invite recipient. */
export async function loadCounterpartyStats(client, userId) {
    const res = await client.query(`SELECT u.username,
            u.account_label,
            (SELECT count(*)::int FROM deals d
              WHERE d.seller_id = u.id AND d.status = 'Released') AS completed
       FROM users u WHERE u.id = $1 LIMIT 1`, [userId]);
    return res.rows[0] ?? null;
}
export async function loadSnapshotForInvite(inviteId) {
    const res = await query(`SELECT invite_id, counterparty_user_id, account_label, completed_deals_count,
            dispute_rate_band, risk_warning
       FROM invite_safety_snapshots
      WHERE invite_id = $1 ORDER BY created_at DESC LIMIT 1`, [inviteId]);
    const row = res.rows[0];
    if (!row) {
        return null;
    }
    return {
        inviteId: row.invite_id,
        counterpartyUserId: row.counterparty_user_id,
        accountLabel: row.account_label,
        completedDealsCount: row.completed_deals_count,
        disputeRateBand: row.dispute_rate_band,
        riskWarning: row.risk_warning,
    };
}
//# sourceMappingURL=invite.repository.js.map