/**
 * Read-side access for handover items (task 7.2). The projection deliberately
 * excludes `encrypted_payload` and any vault secrets — only status fields are
 * returned, so credentials are never exposed through this read path. Reveal of
 * actual secrets is a separate, audited middleman action. (Requirements 40.x)
 */
import { query } from '@trustvexa/shared';

export interface HandoverDealAccessRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  status: string;
}

export async function getDealAccess(dealId: string): Promise<HandoverDealAccessRow | null> {
  const res = await query<HandoverDealAccessRow>(
    `SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface HandoverItemRow {
  id: string;
  item_type: string;
  verification_status: string;
  reveal_status: string;
  transferred_to_buyer_at: Date | string | null;
  created_at: Date | string;
}

export async function listHandoverItems(dealId: string): Promise<HandoverItemRow[]> {
  const res = await query<HandoverItemRow>(
    `SELECT id, item_type, verification_status, reveal_status,
            transferred_to_buyer_at, created_at
       FROM handover_items WHERE deal_id = $1
      ORDER BY created_at ASC LIMIT 100`,
    [dealId],
  );
  return res.rows;
}

export interface HandoverItemDetailRow {
  id: string;
  deal_id: string;
  item_type: string;
  verification_status: string;
  reveal_status: string;
  transferred_to_buyer_at: Date | string | null;
  created_at: Date | string;
}

/** Single handover item with its owning deal id, for access checks before a reveal. */
export async function getHandoverItemById(itemId: string): Promise<HandoverItemDetailRow | null> {
  const res = await query<HandoverItemDetailRow>(
    `SELECT id, deal_id, item_type, verification_status, reveal_status,
            transferred_to_buyer_at, created_at
       FROM handover_items WHERE id = $1 LIMIT 1`,
    [itemId],
  );
  return res.rows[0] ?? null;
}
