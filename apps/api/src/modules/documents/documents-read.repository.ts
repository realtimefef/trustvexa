/**
 * Read-side access for the documents module (task 7.8). Used only to resolve
 * the caller's relationship to a deal so document permissions can be computed.
 */
import { query } from '@trustvexa/shared';

export interface DealDocAccessRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  status: string;
}

export async function getDealAccess(dealId: string): Promise<DealDocAccessRow | null> {
  const res = await query<DealDocAccessRow>(
    `SELECT buyer_id, seller_id, middleman_id, status FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}
