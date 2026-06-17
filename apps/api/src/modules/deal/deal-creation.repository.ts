/**
 * Data access for deal creation, duplication, and drafts (task 4.1).
 *
 * Creation and duplication run inside ONE transaction (deal row + initial terms
 * snapshot) using the shared `TxClient`; draft operations are single,
 * parameterized statements always scoped by `user_id` so one user can never
 * read or mutate another user's draft. All SQL is parameterized. (Requirements
 * 8.6, 8.7)
 */
import { query } from '@trustvexa/shared';

import type { TxClient } from './deal.repository.js';
import type { FeePayer, NetworkMode } from './deal-creation.service.js';

export interface InsertDealParams {
  sellerId: string;
  buyerId?: string | null;
  coin: string;
  network: string;
  networkMode: NetworkMode;
  isPractice: boolean;
  dealAmountCents: number;
  feePayer: FeePayer;
  feeSplitBuyerBps: number | null;
  priceTolerancePct: number | null;
  templateId: string | null;
  productId: string | null;
  preferredMiddlemanId?: string | null;
}

export interface InsertedDealRow {
  id: string;
  status: string;
  created_at: string;
}

/**
 * Insert a fresh deal. `buyer_id` is set when the deal is created from a
 * connection (both parties already known); otherwise it is left NULL and the
 * counterparty joins later. `middleman_id` is always NULL at creation.
 * `status` defaults to 'Created', `version_no` to 0, `attempt_no` to 1.
 */
export async function insertDeal(
  client: TxClient,
  params: InsertDealParams,
): Promise<InsertedDealRow> {
  const res = await client.query<InsertedDealRow>(
    `INSERT INTO deals
       (seller_id, buyer_id, coin, network, network_mode, is_practice,
        deal_amount, fee_payer, fee_split_buyer_bps, price_tolerance_pct, template_id, product_id, preferred_middleman_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, status, created_at`,
    [
      params.sellerId,
      params.buyerId ?? null,
      params.coin,
      params.network,
      params.networkMode,
      params.isPractice,
      params.dealAmountCents,
      params.feePayer,
      params.feeSplitBuyerBps,
      params.priceTolerancePct,
      params.templateId,
      params.productId,
      params.preferredMiddlemanId ?? null,
    ],
  );
  // A single-row INSERT ... RETURNING always yields exactly one row.
  return res.rows[0] as InsertedDealRow;
}

/** Insert a versioned terms snapshot for a deal. */
export async function insertDealTermsSnapshot(
  client: TxClient,
  dealId: string,
  version: number,
  termsSnapshot: string,
): Promise<void> {
  await client.query(
    `INSERT INTO deal_terms (deal_id, version, terms_snapshot) VALUES ($1, $2, $3)`,
    [dealId, version, termsSnapshot],
  );
}

export interface DuplicableDealRow {
  coin: string;
  network: string;
  network_mode: NetworkMode;
  is_practice: boolean;
  deal_amount: number | null;
  fee_payer: FeePayer | null;
  fee_split_buyer_bps: number | null;
  price_tolerance_pct: number | null;
  template_id: string | null;
  product_id: string | null;
}

/**
 * Load just the clonable settings of a past deal, scoped to its owner. Returns
 * null when the deal does not exist OR is not owned by the requesting seller,
 * so duplication can never leak another user's deal (Requirement 8.7). The
 * query deliberately omits buyer/middleman ids and all computed money columns.
 */
export async function loadDealForDuplication(
  client: TxClient,
  dealId: string,
  sellerId: string,
): Promise<DuplicableDealRow | null> {
  const res = await client.query<DuplicableDealRow>(
    `SELECT coin, network, network_mode, is_practice, deal_amount,
            fee_payer, fee_split_buyer_bps, price_tolerance_pct, template_id, product_id
       FROM deals
      WHERE id = $1 AND seller_id = $2
      LIMIT 1`,
    [dealId, sellerId],
  );
  return res.rows[0] ?? null;
}

/** Load the latest terms snapshot text for a deal (or null when none exists). */
export async function loadLatestTermsSnapshot(
  client: TxClient,
  dealId: string,
): Promise<string | null> {
  const res = await client.query<{ terms_snapshot: string | null }>(
    `SELECT terms_snapshot FROM deal_terms WHERE deal_id = $1 ORDER BY version DESC LIMIT 1`,
    [dealId],
  );
  return res.rows[0]?.terms_snapshot ?? null;
}

// --- drafts (Requirement 8.6) ---

export interface DraftRow {
  id: string;
  draft_data_enc: string | null;
  last_step: string | null;
  updated_at: string;
  created_at: string;
}

export interface DraftSummaryRow {
  id: string;
  last_step: string | null;
  updated_at: string;
  created_at: string;
}

export async function insertDraft(
  userId: string,
  dataEnc: string,
  lastStep: string,
): Promise<DraftSummaryRow> {
  const res = await query<DraftSummaryRow>(
    `INSERT INTO deal_drafts (user_id, draft_data_enc, last_step, updated_at)
     VALUES ($1, $2, $3, now())
     RETURNING id, last_step, updated_at, created_at`,
    [userId, dataEnc, lastStep],
  );
  return res.rows[0] as DraftSummaryRow;
}

export async function updateDraft(
  userId: string,
  draftId: string,
  dataEnc: string,
  lastStep: string,
): Promise<DraftSummaryRow | null> {
  const res = await query<DraftSummaryRow>(
    `UPDATE deal_drafts
        SET draft_data_enc = $1, last_step = $2, updated_at = now()
      WHERE id = $3 AND user_id = $4
      RETURNING id, last_step, updated_at, created_at`,
    [dataEnc, lastStep, draftId, userId],
  );
  return res.rows[0] ?? null;
}

export async function getDraft(userId: string, draftId: string): Promise<DraftRow | null> {
  const res = await query<DraftRow>(
    `SELECT id, draft_data_enc, last_step, updated_at, created_at
       FROM deal_drafts WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [draftId, userId],
  );
  return res.rows[0] ?? null;
}

export async function listDrafts(userId: string): Promise<DraftSummaryRow[]> {
  const res = await query<DraftSummaryRow>(
    `SELECT id, last_step, updated_at, created_at
       FROM deal_drafts WHERE user_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return res.rows;
}

export async function deleteDraft(userId: string, draftId: string): Promise<number> {
  const res = await query(`DELETE FROM deal_drafts WHERE id = $1 AND user_id = $2`, [
    draftId,
    userId,
  ]);
  return res.rowCount ?? 0;
}
