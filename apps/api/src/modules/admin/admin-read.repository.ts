/**
 * Read-side data access for the middleman/admin console (task 7.2). All reads
 * are scoped to the signed-in middleman via `deals.middleman_id`, so a
 * middleman only ever sees the deals (and their disputes) they are assigned to.
 * Money columns are `bigint` and pass through as decimal strings unchanged.
 * (Requirements 34.x, 7.x)
 */
import { query } from '@trustvexa/shared';

import type { DealStatus } from '../deal/state-machine.js';

/** A deal assigned to the middleman, projected for the work queue. */
export interface MiddlemanDealRow {
  id: string;
  status: DealStatus;
  risk_score: number | null;
  deal_amount: string | null;
  coin: string;
  network: string;
  is_practice: boolean;
  hold_status: string | null;
  last_activity_at: Date | string | null;
  fund_by: Date | string | null;
  complete_by: Date | string | null;
}

/** Every deal the middleman is assigned to, most-recently-active first. */
export async function listMiddlemanQueue(userId: string): Promise<MiddlemanDealRow[]> {
  const res = await query<MiddlemanDealRow>(
    `SELECT id, status, risk_score, deal_amount, coin, network, is_practice,
            hold_status, last_activity_at, fund_by, complete_by
       FROM deals
      WHERE middleman_id = $1
      ORDER BY COALESCE(last_activity_at, updated_at, created_at) DESC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}

/** An open dispute on one of the middleman's deals. */
export interface AdminDisputeRow {
  id: string;
  deal_id: string;
  reason: string | null;
  status: string;
  created_at: Date | string;
  deal_status: DealStatus;
  coin: string;
  network: string;
}

/** Open / under-review disputes for deals this middleman handles. */
export async function listOpenDisputesForMiddleman(userId: string): Promise<AdminDisputeRow[]> {
  const res = await query<AdminDisputeRow>(
    `SELECT dp.id, dp.deal_id, dp.reason, dp.status, dp.created_at,
            d.status AS deal_status, d.coin, d.network
       FROM disputes dp
       JOIN deals d ON d.id = dp.deal_id
      WHERE d.middleman_id = $1 AND dp.status IN ('open', 'under_review')
      ORDER BY dp.created_at ASC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}
