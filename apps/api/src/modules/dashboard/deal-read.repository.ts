/**
 * Read-side deal data access for the buyer/seller/middleman dashboards and the
 * deal-detail view (task 7.1). All reads are scoped to the requesting user via
 * the `buyer_id | seller_id | middleman_id` columns so a user can only ever see
 * deals they are a party to. Money columns are `bigint` and are returned by
 * node-postgres as decimal strings; they are passed through unchanged (the UI
 * formats them) so no precision is lost. (Requirements 37.4, 36.1, 17.1)
 */
import { query } from '@trustvexa/shared';

import type { DealStatus } from '../deal/state-machine.js';

/** A row from `deals` projected for dashboard/detail reads. */
export interface DealRow {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  coin: string;
  network: string;
  network_mode: string;
  is_practice: boolean;
  deal_amount: string | null;
  amount_coin: string | null;
  amount_smallest_unit: string | null;
  locked_fx_rate: string | null;
  fx_source: string | null;
  price_tolerance_pct: string | null;
  fee_payer: string | null;
  platform_fee: string | null;
  seller_settlement_fee: string | null;
  transaction_fee: string | null;
  buyer_total: string | null;
  seller_payout: string | null;
  status: DealStatus;
  hold_status: string | null;
  legal_hold: boolean;
  attempt_no: number;
  risk_score: number | null;
  fund_by: Date | string | null;
  complete_by: Date | string | null;
  inspection_until: Date | string | null;
  last_activity_at: Date | string | null;
  version_no: number;
  created_at: Date | string;
  updated_at: Date | string;
  /** Agreement progress columns (added by migration 1700002000000_deal_agreement_lock). */
  buyer_agreed_at: Date | string | null;
  seller_agreed_at: Date | string | null;
  locked_at: Date | string | null;
  /** Free-text item label (added by migration 1700002800000_deal_item_description). */
  item_description: string | null;
  /** Independent per-side submission timestamps (migration 1700003700000). */
  buyer_submitted_at: Date | string | null;
  seller_submitted_at: Date | string | null;
  /** The connection this deal was created from (detail read only). */
  connection_id?: string | null;
  connection_code?: string | null;
}

/** Exact column list shared by the list and detail reads. */
const DEAL_COLUMNS = `
  id, buyer_id, seller_id, middleman_id, coin, network, network_mode, is_practice,
  deal_amount, amount_coin, amount_smallest_unit, locked_fx_rate, fx_source,
  price_tolerance_pct, fee_payer, platform_fee, seller_settlement_fee,
  transaction_fee, buyer_total, seller_payout, status, hold_status, legal_hold,
  attempt_no, risk_score, fund_by, complete_by, inspection_until,
  last_activity_at, version_no, created_at, updated_at,
  buyer_agreed_at, seller_agreed_at, locked_at,
  buyer_submitted_at, seller_submitted_at,
  item_description`;

/** All deals the user is a party to, most-recently-active first. */
export async function listDealsForUser(userId: string): Promise<DealRow[]> {
  const res = await query<DealRow>(
    `SELECT ${DEAL_COLUMNS}
       FROM deals
      WHERE buyer_id = $1 OR seller_id = $1 OR middleman_id = $1
      ORDER BY COALESCE(last_activity_at, updated_at, created_at) DESC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}

/** A single deal, but only if the user is a party to it (else `null`). */
export async function getDealForUser(dealId: string, userId: string): Promise<DealRow | null> {
  const res = await query<DealRow>(
    `SELECT ${DEAL_COLUMNS},
            (SELECT c.id   FROM connections c WHERE c.deal_id = deals.id ORDER BY c.created_at ASC LIMIT 1) AS connection_id,
            (SELECT c.code FROM connections c WHERE c.deal_id = deals.id ORDER BY c.created_at ASC LIMIT 1) AS connection_code
       FROM deals
      WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2 OR middleman_id = $2)
      LIMIT 1`,
    [dealId, userId],
  );
  return res.rows[0] ?? null;
}

/** A hash-chained escrow-log row projected for the activity timeline. */
export interface TimelineRow {
  action: string;
  from_state: string | null;
  to_state: string | null;
  visibility: 'user' | 'middleman_only';
  actor_id: string | null;
  created_at: Date | string;
}

/**
 * The deal's audit timeline. `middleman_only` rows are included only when the
 * caller is the middleman; buyers and sellers see `user`-visible rows only
 * (Requirement 36.1 visibility split).
 */
export async function loadTimeline(
  dealId: string,
  includeMiddlemanOnly: boolean,
): Promise<TimelineRow[]> {
  const res = await query<TimelineRow>(
    `SELECT action, from_state, to_state, visibility, actor_id, created_at
       FROM escrow_logs
      WHERE deal_id = $1 AND ($2::boolean OR visibility = 'user')
      ORDER BY created_at ASC
      LIMIT 500`,
    [dealId, includeMiddlemanOnly],
  );
  return res.rows;
}
