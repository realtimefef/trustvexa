// Milestone + delivery-checklist persistence for the release money flow
// (task 7.2). All helpers take the money-write transaction client so the
// milestone update, the ledger postings, and the deal-state transitions commit
// atomically. Not barrel-exported. (Requirements 40.1-40.6)

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export interface MilestoneDealRow {
  id: string;
  middleman_id: string | null;
  status: string;
  coin: string;
  network: string;
  amount_smallest_unit: string | null;
  version_no: number;
}

/** Lock the deal row for the duration of the milestone-release transaction. */
export async function lockDeal(tx: TxClient, dealId: string): Promise<MilestoneDealRow | null> {
  const { rows } = await tx.query<MilestoneDealRow>(
    `SELECT id, middleman_id, status, coin, network, amount_smallest_unit, version_no
       FROM deals WHERE id = $1 FOR UPDATE`,
    [dealId],
  );
  return rows[0] ?? null;
}

export interface MilestoneRow {
  id: string;
  deal_id: string;
  amount_smallest_unit: string | null;
  status: string | null;
}

/** Read one milestone scoped to its deal. */
export async function getMilestone(
  tx: TxClient,
  dealId: string,
  milestoneId: string,
): Promise<MilestoneRow | null> {
  const { rows } = await tx.query<MilestoneRow>(
    `SELECT id, deal_id, amount_smallest_unit, status
       FROM deal_milestones WHERE id = $1 AND deal_id = $2`,
    [milestoneId, dealId],
  );
  return rows[0] ?? null;
}

/** Sum the amounts of milestones already released for a deal (smallest units). */
export async function sumReleasedMilestones(tx: TxClient, dealId: string): Promise<bigint> {
  const { rows } = await tx.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(amount_smallest_unit), 0)::text AS total
       FROM deal_milestones WHERE deal_id = $1 AND status = 'released'`,
    [dealId],
  );
  return BigInt(rows[0]?.total ?? '0');
}

export interface ChecklistRow {
  item_key: string;
  checked_at: string | null;
}

/** List the delivery checklist rows for a deal (every row is a required item). */
export async function listDeliveryChecklist(tx: TxClient, dealId: string): Promise<ChecklistRow[]> {
  const { rows } = await tx.query<ChecklistRow>(
    `SELECT item_key, checked_at FROM delivery_checklists WHERE deal_id = $1`,
    [dealId],
  );
  return rows;
}

/** Mark a milestone released under an optimistic guard (only if not already released). */
export async function markMilestoneReleased(tx: TxClient, milestoneId: string): Promise<number> {
  const result = await tx.query(
    `UPDATE deal_milestones SET status = 'released', released_at = now()
       WHERE id = $1 AND status IS DISTINCT FROM 'released'`,
    [milestoneId],
  );
  return result.rowCount ?? 0;
}

/** Transition a deal's status under an optimistic guard on its current state. */
export async function setDealStatusFrom(
  tx: TxClient,
  dealId: string,
  fromStatus: string,
  toStatus: string,
): Promise<number> {
  const result = await tx.query(
    `UPDATE deals SET status = $3::deal_status, last_activity_at = now()
       WHERE id = $1 AND status = $2::deal_status`,
    [dealId, fromStatus, toStatus],
  );
  return result.rowCount ?? 0;
}

/**
 * Record a delivery-checklist item as completed (proof submitted). Upserts the
 * `(deal_id, checklist_type, item_key)` row, stamping `checked_by`/`checked_at`
 * so `listDeliveryChecklist` can treat it as done.
 */
export async function markDeliveryChecklistItem(
  tx: TxClient,
  input: {
    dealId: string;
    checklistType: string;
    itemKey: string;
    checkedBy: string;
  },
): Promise<void> {
  const existing = await tx.query<{ id: string }>(
    `SELECT id FROM delivery_checklists
       WHERE deal_id = $1 AND checklist_type = $2 AND item_key = $3
       LIMIT 1`,
    [input.dealId, input.checklistType, input.itemKey],
  );
  if (existing.rows[0]) {
    await tx.query(
      `UPDATE delivery_checklists SET checked_by = $2, checked_at = now() WHERE id = $1`,
      [existing.rows[0].id, input.checkedBy],
    );
    return;
  }
  await tx.query(
    `INSERT INTO delivery_checklists (deal_id, checklist_type, item_key, checked_by, checked_at)
     VALUES ($1, $2, $3, $4, now())`,
    [input.dealId, input.checklistType, input.itemKey, input.checkedBy],
  );
}
