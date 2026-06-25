/**
 * Data access for secure seller invites (task 4.3, Requirements 8.1-8.5).
 *
 * Tokens are stored only as HMAC hashes (`token_hash`, unique). Single-use and
 * revocation are enforced atomically in SQL: the "consume" update only matches
 * an invite that is still unused, unrevoked, and unexpired, so two concurrent
 * accepts can never both win. All SQL is parameterized.
 */
import { query } from '@trustvexa/shared';

import type { TxClient } from './deal.repository.js';

export interface InsertInviteParams {
  dealId: string;
  tokenHash: string;
  intendedUserHint: string | null;
  singleUse: boolean;
  expiresAt: string | null;
}

export async function insertInvite(
  client: TxClient,
  params: InsertInviteParams,
): Promise<{ id: string; created_at: string }> {
  const res = await client.query<{ id: string; created_at: string }>(
    `INSERT INTO deal_invites
       (deal_id, token_hash, intended_user_hint, single_use, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [params.dealId, params.tokenHash, params.intendedUserHint, params.singleUse, params.expiresAt],
  );
  return res.rows[0] as { id: string; created_at: string };
}

export interface InviteRow {
  id: string;
  deal_id: string;
  single_use: boolean;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
}

export async function getInviteByTokenHash(tokenHash: string): Promise<InviteRow | null> {
  const res = await query<InviteRow>(
    `SELECT id, deal_id, single_use, expires_at, used_at, revoked_at
       FROM deal_invites WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  return res.rows[0] ?? null;
}

/**
 * Atomically consume a single-use invite. Returns true only if THIS call
 * flipped it from unused -> used; a second concurrent call matches 0 rows.
 */
export async function consumeInvite(client: TxClient, inviteId: string): Promise<boolean> {
  const res = await client.query(
    `UPDATE deal_invites
        SET used_at = now()
      WHERE id = $1
        AND revoked_at IS NULL
        AND (single_use = false OR used_at IS NULL)
        AND (expires_at IS NULL OR expires_at > now())`,
    [inviteId],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Revoke an invite, scoped to the deal's owner. Returns true if revoked. */
export async function revokeInvite(
  inviteId: string,
  sellerId: string,
  reason: string | null,
): Promise<boolean> {
  const res = await query(
    `UPDATE deal_invites di
        SET revoked_at = now(), revoked_by = $2, revoke_reason = $3
       FROM deals d
      WHERE di.id = $1
        AND di.deal_id = d.id
        AND d.seller_id = $2
        AND di.revoked_at IS NULL
        AND di.used_at IS NULL`,
    [inviteId, sellerId, reason],
  );
  return (res.rowCount ?? 0) > 0;
}

export interface InviteSummaryRow {
  id: string;
  intended_user_hint: string | null;
  single_use: boolean;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export async function listInvitesForDeal(
  dealId: string,
  sellerId: string,
): Promise<InviteSummaryRow[]> {
  const res = await query<InviteSummaryRow>(
    `SELECT di.id, di.intended_user_hint, di.single_use, di.expires_at,
            di.used_at, di.revoked_at, di.created_at
       FROM deal_invites di
       JOIN deals d ON d.id = di.deal_id
      WHERE di.deal_id = $1 AND d.seller_id = $2
      ORDER BY di.created_at DESC`,
    [dealId, sellerId],
  );
  return res.rows;
}

export interface InviteDealRow {
  id: string;
  status: string;
  seller_id: string | null;
  buyer_id: string | null;
  coin: string;
  network: string;
  deal_amount: number | null;
}

/** Load a deal scoped to its creating party (null if not found / not a party).
 * The creator may be on EITHER side — when they chose to be the buyer the deal
 * has buyer_id = creator and seller_id NULL, so we match either slot. */
export async function loadOwnedDeal(
  client: TxClient,
  dealId: string,
  sellerId: string,
): Promise<InviteDealRow | null> {
  const res = await client.query<InviteDealRow>(
    `SELECT id, status, seller_id, buyer_id, coin, network, deal_amount
       FROM deals WHERE id = $1 AND (seller_id = $2 OR buyer_id = $2) LIMIT 1`,
    [dealId, sellerId],
  );
  return res.rows[0] ?? null;
}

/** Load minimal deal facts for an invite recipient (no owner scope). */
export async function loadDealForRecipient(dealId: string): Promise<InviteDealRow | null> {
  const res = await query<InviteDealRow>(
    `SELECT id, status, seller_id, buyer_id, coin, network, deal_amount
       FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

/**
 * Atomically attach a buyer to a deal that has no buyer yet. Returns true only
 * if THIS call set the buyer (prevents two recipients claiming one deal, and
 * blocks the seller from joining their own deal).
 */
export async function attachBuyer(
  client: TxClient,
  dealId: string,
  buyerId: string,
): Promise<boolean> {
  const res = await client.query(
    `UPDATE deals
        SET buyer_id = $2, updated_at = now()
      WHERE id = $1 AND buyer_id IS NULL AND seller_id <> $2`,
    [dealId, buyerId],
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Atomically attach a SELLER to a deal that has no seller yet (used when the
 * deal's creator chose to be the buyer, leaving the seller slot open for the
 * invitee). Returns true only if THIS call set the seller.
 */
export async function attachSeller(
  client: TxClient,
  dealId: string,
  sellerId: string,
): Promise<boolean> {
  const res = await client.query(
    `UPDATE deals
        SET seller_id = $2, updated_at = now()
      WHERE id = $1 AND seller_id IS NULL AND buyer_id <> $2`,
    [dealId, sellerId],
  );
  return (res.rowCount ?? 0) > 0;
}

// --- invite safety snapshot (Requirement 8.2) ---

export interface SafetySnapshotInput {
  inviteId: string;
  counterpartyUserId: string | null;
  accountLabel: string | null;
  completedDealsCount: number | null;
  disputeRateBand: string | null;
  riskWarning: string | null;
}

export async function insertInviteSafetySnapshot(
  client: TxClient,
  snap: SafetySnapshotInput,
): Promise<void> {
  await client.query(
    `INSERT INTO invite_safety_snapshots
       (invite_id, counterparty_user_id, account_label, completed_deals_count,
        dispute_rate_band, risk_warning)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      snap.inviteId,
      snap.counterpartyUserId,
      snap.accountLabel,
      snap.completedDealsCount,
      snap.disputeRateBand,
      snap.riskWarning,
    ],
  );
}

export interface CounterpartyStatsRow {
  username: string;
  account_label: string;
  completed: number;
}

/** Snapshot stats of a user shown to an invite recipient. */
export async function loadCounterpartyStats(
  client: TxClient,
  userId: string,
): Promise<CounterpartyStatsRow | null> {
  const res = await client.query<CounterpartyStatsRow>(
    `SELECT u.username,
            u.account_label,
            (SELECT count(*)::int FROM deals d
              WHERE d.seller_id = u.id AND d.status = 'Released') AS completed
       FROM users u WHERE u.id = $1 LIMIT 1`,
    [userId],
  );
  return res.rows[0] ?? null;
}

export async function loadSnapshotForInvite(inviteId: string): Promise<SafetySnapshotInput | null> {
  const res = await query<{
    invite_id: string;
    counterparty_user_id: string | null;
    account_label: string | null;
    completed_deals_count: number | null;
    dispute_rate_band: string | null;
    risk_warning: string | null;
  }>(
    `SELECT invite_id, counterparty_user_id, account_label, completed_deals_count,
            dispute_rate_band, risk_warning
       FROM invite_safety_snapshots
      WHERE invite_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [inviteId],
  );
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
