/**
 * Dashboard service (task 7.1). Composes the read-side deal rows with the pure
 * action-center logic so each deal carries the prioritized "what to do next"
 * for the requesting user's role, and the deal-detail view also carries the
 * ordered activity timeline. The user's role is derived server-side from the
 * deal's party columns, never trusted from the client. (Requirements 37.4,
 * 48.5, 36.1)
 */
import { query } from '@trustvexa/shared';
import { notFound } from '../../errors/app-error.js';
import type { DealRole } from '../chat/chat-types.js';
import type { DealStatus } from '../deal/state-machine.js';
import { isWaitingOn, nextActionsFor, orderTimeline } from './action-center.js';
import type { NextAction, TimelineEntry } from './action-center.js';
import {
  getDealForUser,
  listDealsForUser,
  loadTimeline,
  type DealRow,
  type TimelineRow,
} from './deal-read.repository.js';

export interface DealSummary {
  id: string;
  role: DealRole;
  status: DealStatus;
  coin: string;
  network: string;
  networkMode: string;
  isPractice: boolean;
  dealAmountCents: string | null;
  amountCoin: string | null;
  feePayer: string | null;
  buyerTotalCents: string | null;
  sellerPayoutCents: string | null;
  holdStatus: string | null;
  riskScore: number | null;
  fundBy: string | null;
  completeBy: string | null;
  inspectionUntil: string | null;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
  nextActions: readonly NextAction[];
  waitingOnYou: boolean;
  tags?: string[];
  itemDescription: string | null;
}

export interface DealDetail extends DealSummary {
  amountSmallestUnit: string | null;
  lockedFxRate: string | null;
  fxSource: string | null;
  priceTolerancePct: string | null;
  platformFeeCents: string | null;
  sellerSettlementFeeCents: string | null;
  transactionFeeCents: string | null;
  legalHold: boolean;
  attemptNo: number;
  versionNo: number;
  timeline: TimelineEntry[];
  /** Party IDs — lets the UI skip the invite flow when a deal was created from a connection. */
  buyerId: string | null;
  sellerId: string | null;
  /** The assigned middleman's ID — null when no middleman has been added yet.
   * Used by the UI to hide the "Add middleman" button when one is already assigned. */
  middlemanId: string | null;
  /** Agreement progress — exposed so the UI can show "you already agreed"
   * even when the other party hasn't agreed yet (status stays 'Created'). */
  lockedAt: string | null;
  buyerAgreedAt: string | null;
  sellerAgreedAt: string | null;
  /** Independent per-side submission timestamps (each side submits to the
   * middleman on its own; neither changes the deal status). */
  buyerSubmittedAt: string | null;
  sellerSubmittedAt: string | null;
  /** The connection (chat) this deal was created from — shown in the header and
   * used to deep-link into the deal's chat on /connect. */
  connectionId: string | null;
  connectionCode: string | null;
}

/** Determine which party the user is for this deal, or `null` if none. */
function roleForUser(deal: DealRow, userId: string): DealRole | null {
  if (deal.buyer_id === userId) return 'buyer';
  if (deal.seller_id === userId) return 'seller';
  if (deal.middleman_id === userId) return 'middleman';
  return null;
}

/** Map a timeline row's actor id to a party role (or `system` when unset). */
function actorRoleFor(row: TimelineRow, deal: DealRow): DealRole | 'system' {
  if (row.actor_id === null) return 'system';
  if (row.actor_id === deal.buyer_id) return 'buyer';
  if (row.actor_id === deal.seller_id) return 'seller';
  if (row.actor_id === deal.middleman_id) return 'middleman';
  return 'system';
}

/** Normalize a pg timestamp (Date or string) to an ISO string, or `null`. */
function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toSummary(deal: DealRow, role: DealRole): DealSummary {
  return {
    id: deal.id,
    role,
    status: deal.status,
    coin: deal.coin,
    network: deal.network,
    networkMode: deal.network_mode,
    isPractice: deal.is_practice,
    dealAmountCents: deal.deal_amount,
    amountCoin: deal.amount_coin,
    feePayer: deal.fee_payer,
    buyerTotalCents: deal.buyer_total,
    sellerPayoutCents: deal.seller_payout,
    holdStatus: deal.hold_status,
    riskScore: deal.risk_score,
    fundBy: toIso(deal.fund_by),
    completeBy: toIso(deal.complete_by),
    inspectionUntil: toIso(deal.inspection_until),
    lastActivityAt: toIso(deal.last_activity_at),
    createdAt: toIso(deal.created_at) ?? '',
    updatedAt: toIso(deal.updated_at) ?? '',
    nextActions: nextActionsFor(role, deal.status),
    waitingOnYou: isWaitingOn(role, deal.status),
    itemDescription: deal.item_description,
  };
}

/** Buyer/seller/middleman dashboard: every deal the user is a party to. */
export async function getDashboard(userId: string): Promise<{ deals: DealSummary[] }> {
  const rows = await listDealsForUser(userId);
  const tagsRes = await query<{ deal_id: string; label: string }>(
    `SELECT deal_id, label FROM deal_tags WHERE user_id = $1`,
    [userId],
  );
  const tagsMap: Record<string, string[]> = {};
  for (const tagRow of tagsRes.rows) {
    if (tagRow.deal_id) {
      const arr = tagsMap[tagRow.deal_id] ?? [];
      arr.push(tagRow.label);
      tagsMap[tagRow.deal_id] = arr;
    }
  }

  const deals: DealSummary[] = [];
  for (const row of rows) {
    const role = roleForUser(row, userId);
    if (role === null) continue;
    const summary = toSummary(row, role);
    summary.tags = tagsMap[row.id] ?? [];
    deals.push(summary);
  }
  return { deals };
}

/** Deal-detail view: full snapshot + role-filtered activity timeline. */
export async function getDealDetail(userId: string, dealId: string): Promise<DealDetail> {
  const row = await getDealForUser(dealId, userId);
  if (row === null) {
    // Same 404 whether the deal does not exist or the user is not a party, so
    // the endpoint never confirms the existence of someone else's deal.
    throw notFound('Deal was not found.');
  }
  const role = roleForUser(row, userId);
  if (role === null) {
    throw notFound('Deal was not found.');
  }

  const timelineRows = await loadTimeline(dealId, role === 'middleman');
  const entries: TimelineEntry[] = timelineRows.map((t) => ({
    at: toIso(t.created_at) ?? '',
    code: t.action,
    actorRole: actorRoleFor(t, row),
  }));
  const timeline = orderTimeline(entries);

  const tagsRes = await query<{ label: string }>(
    `SELECT label FROM deal_tags WHERE user_id = $1 AND deal_id = $2`,
    [userId, dealId],
  );
  const tags = tagsRes.rows.map((r) => r.label);

  return {
    ...toSummary(row, role),
    amountSmallestUnit: row.amount_smallest_unit,
    lockedFxRate: row.locked_fx_rate,
    fxSource: row.fx_source,
    priceTolerancePct: row.price_tolerance_pct,
    platformFeeCents: row.platform_fee,
    sellerSettlementFeeCents: row.seller_settlement_fee,
    transactionFeeCents: row.transaction_fee,
    legalHold: row.legal_hold,
    attemptNo: row.attempt_no,
    versionNo: row.version_no,
    timeline,
    tags,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    middlemanId: row.middleman_id,
    // Agreement progress — exposed so the UI can show "you already agreed"
    // even when the other party hasn't agreed yet (status stays 'Created').
    lockedAt: row.locked_at ? new Date(row.locked_at as string).toISOString() : null,
    buyerAgreedAt: row.buyer_agreed_at ? new Date(row.buyer_agreed_at as string).toISOString() : null,
    sellerAgreedAt: row.seller_agreed_at ? new Date(row.seller_agreed_at as string).toISOString() : null,
    buyerSubmittedAt: row.buyer_submitted_at ? new Date(row.buyer_submitted_at as string).toISOString() : null,
    sellerSubmittedAt: row.seller_submitted_at ? new Date(row.seller_submitted_at as string).toISOString() : null,
    connectionId: row.connection_id ?? null,
    connectionCode: row.connection_code ?? null,
  };
}
