/**
 * Secure seller invite service (task 4.3, Requirements 8.1-8.5).
 *
 * Flow:
 *  - createInvite: the deal owner mints a one-time, expiring, revocable invite.
 *    The plaintext token is returned exactly once; only its HMAC hash is
 *    stored. A safety snapshot of the seller (shown to the recipient) is
 *    written in the same transaction, and a Created deal is moved to Invited
 *    through the audited state machine (Requirement 13.4).
 *  - previewInvite: a recipient sees which deal + counterparty they are joining
 *    WITHOUT consuming the token (Requirement 8.2).
 *  - acceptInvite: atomically consumes the token (single-use) and attaches the
 *    buyer. Reused / expired / revoked tokens are rejected (8.3, 8.4).
 *  - revokeInvite: the seller disables an invite (8.5).
 */
import { AppError } from '../../errors/app-error.js';
import { checkInviteCodeAbuse } from '../../lib/abuse-detector.js';

import { getDealConfig } from './deal.config.js';
import { acquireClient } from './deal.repository.js';
import type { TxClient } from './deal.repository.js';
import { applyDealTransition } from './deal.service.js';
import {
  evaluateInvite,
  generateInviteToken,
  hashInviteToken,
  type InviteUsability,
} from './invite-token.js';
import {
  attachBuyer,
  consumeInvite,
  getInviteByTokenHash,
  insertInvite,
  insertInviteSafetySnapshot,
  listInvitesForDeal,
  loadCounterpartyStats,
  loadDealForRecipient,
  loadOwnedDeal,
  loadSnapshotForInvite,
  revokeInvite as revokeInviteRow,
} from './invite.repository.js';
import type { InviteSummaryRow } from './invite.repository.js';
import type { CreateInviteInput } from './invite.schemas.js';

const INVITABLE_STATES: ReadonlySet<string> = new Set(['Created', 'Invited']);

export interface CreatedInvite {
  inviteId: string;
  token: string;
  inviteUrl: string;
  expiresAt: string | null;
  dealStatus: string;
}

function deriveSafety(stats: { account_label: string; completed: number } | null): {
  band: string;
  warning: string | null;
} {
  if (stats === null) {
    return { band: 'unknown', warning: 'Counterparty profile is unavailable.' };
  }
  const isNew = stats.account_label === 'new_user' || stats.completed === 0;
  return {
    band: isNew ? 'unknown' : 'established',
    warning: isNew
      ? 'This counterparty is new to TrustVexa and has no completed deals yet. Proceed with extra caution.'
      : null,
  };
}

export async function createInvite(args: {
  sellerId: string;
  dealId: string;
  input: CreateInviteInput;
}): Promise<CreatedInvite> {
  const { sellerId, dealId, input } = args;
  const cfg = getDealConfig();

  const token = generateInviteToken();
  const tokenHash = hashInviteToken(token, cfg.inviteTokenHashKey);
  const ttlHours = input.expiresInHours ?? cfg.defaultInviteTtlHours;
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000).toISOString();
  const singleUse = input.singleUse ?? true;

  const client: TxClient = await acquireClient();
  let inviteId: string;
  let statusBefore: string;
  try {
    await client.query('BEGIN');

    const deal = await loadOwnedDeal(client, dealId, sellerId);
    if (deal === null) {
      throw new AppError('deal_not_found', 'Deal was not found or is not owned by you.', 404);
    }
    if (!INVITABLE_STATES.has(deal.status)) {
      throw new AppError(
        'invite_not_allowed',
        `An invite can only be sent while the deal is in Created or Invited (currently ${deal.status}).`,
        409,
      );
    }
    statusBefore = deal.status;

    const invite = await insertInvite(client, {
      dealId,
      tokenHash,
      intendedUserHint: input.intendedUserHint ?? null,
      singleUse,
      expiresAt,
    });
    inviteId = invite.id;

    const stats = await loadCounterpartyStats(client, sellerId);
    const safety = deriveSafety(stats);
    await insertInviteSafetySnapshot(client, {
      inviteId,
      counterpartyUserId: sellerId,
      accountLabel: stats?.account_label ?? null,
      completedDealsCount: stats?.completed ?? null,
      disputeRateBand: safety.band,
      riskWarning: safety.warning,
    });

    await client.query('COMMIT');
  } catch (err) {
    await rollbackQuietly(client);
    throw err;
  } finally {
    client.release();
  }

  // Move Created -> Invited through the audited state machine. A re-issued
  // invite while already Invited needs no transition.
  let dealStatus = statusBefore;
  if (statusBefore === 'Created') {
    const result = await applyDealTransition({
      dealId,
      event: 'SecureInviteSent',
      actorId: sellerId,
      requestId: inviteId,
    });
    dealStatus = result.to;
  }

  return {
    inviteId,
    token,
    inviteUrl: `${cfg.webAppUrl}/invite/${token}`,
    expiresAt,
    dealStatus,
  };
}

export interface InvitePreview {
  dealId: string;
  status: string;
  coin: string;
  network: string;
  dealAmountCents: number | null;
  counterparty: {
    accountLabel: string | null;
    completedDeals: number | null;
    disputeRateBand: string | null;
    riskWarning: string | null;
  } | null;
}

function rejectUnusable(usability: InviteUsability): void {
  if (usability === 'ok') {
    return;
  }
  const map: Record<Exclude<InviteUsability, 'ok'>, readonly [string, string, number]> = {
    used: ['invite_used', 'This invite link has already been used.', 410],
    revoked: ['invite_revoked', 'This invite link has been revoked.', 410],
    expired: ['invite_expired', 'This invite link has expired.', 410],
  };
  const [code, msg, status] = map[usability];
  throw new AppError(code, msg, status);
}

export async function previewInvite(args: {
  viewerId: string;
  token: string;
}): Promise<InvitePreview> {
  await checkInviteCodeAbuse(args.viewerId, args.token);
  const cfg = getDealConfig();
  const tokenHash = hashInviteToken(args.token, cfg.inviteTokenHashKey);
  const invite = await getInviteByTokenHash(tokenHash);
  if (invite === null) {
    throw new AppError('invite_not_found', 'This invite link is not valid.', 404);
  }
  rejectUnusable(
    evaluateInvite({
      usedAt: invite.used_at,
      revokedAt: invite.revoked_at,
      expiresAt: invite.expires_at,
      singleUse: invite.single_use,
    }),
  );

  const deal = await loadDealForRecipient(invite.deal_id);
  if (deal === null) {
    throw new AppError('deal_not_found', 'The deal for this invite no longer exists.', 404);
  }
  const snap = await loadSnapshotForInvite(invite.id);

  return {
    dealId: deal.id,
    status: deal.status,
    coin: deal.coin,
    network: deal.network,
    dealAmountCents: deal.deal_amount,
    counterparty:
      snap === null
        ? null
        : {
            accountLabel: snap.accountLabel,
            completedDeals: snap.completedDealsCount,
            disputeRateBand: snap.disputeRateBand,
            riskWarning: snap.riskWarning,
          },
  };
}

export interface AcceptedInvite {
  dealId: string;
  status: string;
}

export async function acceptInvite(args: {
  userId: string;
  token: string;
}): Promise<AcceptedInvite> {
  await checkInviteCodeAbuse(args.userId, args.token);
  const cfg = getDealConfig();
  const tokenHash = hashInviteToken(args.token, cfg.inviteTokenHashKey);

  const client: TxClient = await acquireClient();
  try {
    await client.query('BEGIN');

    // Lock the invite row first so concurrent accepts serialize.
    const inviteRes = await client.query<{
      id: string;
      deal_id: string;
      single_use: boolean;
      expires_at: string | null;
      used_at: string | null;
      revoked_at: string | null;
    }>(
      `SELECT id, deal_id, single_use, expires_at, used_at, revoked_at
         FROM deal_invites WHERE token_hash = $1 LIMIT 1 FOR UPDATE`,
      [tokenHash],
    );
    const invite = inviteRes.rows[0];
    if (!invite) {
      throw new AppError('invite_not_found', 'This invite link is not valid.', 404);
    }
    rejectUnusable(
      evaluateInvite({
        usedAt: invite.used_at,
        revokedAt: invite.revoked_at,
        expiresAt: invite.expires_at,
        singleUse: invite.single_use,
      }),
    );

    const deal = await loadDealForRecipient(invite.deal_id);
    if (deal === null) {
      throw new AppError('deal_not_found', 'The deal for this invite no longer exists.', 404);
    }
    if (deal.seller_id === args.userId) {
      throw new AppError('invite_self_join', 'You cannot accept your own invite.', 400);
    }

    const consumed = await consumeInvite(client, invite.id);
    if (!consumed) {
      throw new AppError('invite_used', 'This invite link has already been used.', 409);
    }

    const attached = await attachBuyer(client, invite.deal_id, args.userId);
    if (!attached) {
      throw new AppError('deal_already_joined', 'This deal already has a counterparty.', 409);
    }

    const stats = await loadCounterpartyStats(client, args.userId);
    const safety = deriveSafety(stats);
    await insertInviteSafetySnapshot(client, {
      inviteId: invite.id,
      counterpartyUserId: args.userId,
      accountLabel: stats?.account_label ?? null,
      completedDealsCount: stats?.completed ?? null,
      disputeRateBand: safety.band,
      riskWarning: safety.warning,
    });

    await client.query('COMMIT');

    // The buyer has joined. The deal stays in 'Invited' (or 'Created') status.
    // Both parties must still explicitly click "I agree" to lock the deal.
    // Invite acceptance = "buyer is here", NOT "both parties agreed".
    return { dealId: deal.id, status: deal.status };
  } catch (err) {
    await rollbackQuietly(client);
    throw err;
  } finally {
    client.release();
  }
}

export async function listInvites(args: {
  sellerId: string;
  dealId: string;
}): Promise<InviteSummaryRow[]> {
  return listInvitesForDeal(args.dealId, args.sellerId);
}

export async function revokeInvite(args: {
  sellerId: string;
  inviteId: string;
  reason: string | null;
}): Promise<void> {
  const ok = await revokeInviteRow(args.inviteId, args.sellerId, args.reason);
  if (!ok) {
    throw new AppError(
      'invite_not_revocable',
      'Invite was not found, not yours, or already used/revoked.',
      409,
    );
  }
}

async function rollbackQuietly(client: TxClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* transaction already aborted or connection lost */
  }
}
