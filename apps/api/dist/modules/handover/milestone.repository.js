// Milestone + delivery-checklist persistence for the release money flow
// (task 7.2). All helpers take the money-write transaction client so the
// milestone update, the ledger postings, and the deal-state transitions commit
// atomically. Not barrel-exported. (Requirements 40.1-40.6)
/** Lock the deal row for the duration of the milestone-release transaction. */
export async function lockDeal(tx, dealId) {
    const { rows } = await tx.query(`SELECT id, middleman_id, status, coin, network, amount_smallest_unit, version_no
       FROM deals WHERE id = $1 FOR UPDATE`, [dealId]);
    return rows[0] ?? null;
}
/** Read one milestone scoped to its deal. */
export async function getMilestone(tx, dealId, milestoneId) {
    const { rows } = await tx.query(`SELECT id, deal_id, amount_smallest_unit, status
       FROM deal_milestones WHERE id = $1 AND deal_id = $2`, [milestoneId, dealId]);
    return rows[0] ?? null;
}
/** Sum the amounts of milestones already released for a deal (smallest units). */
export async function sumReleasedMilestones(tx, dealId) {
    const { rows } = await tx.query(`SELECT COALESCE(SUM(amount_smallest_unit), 0)::text AS total
       FROM deal_milestones WHERE deal_id = $1 AND status = 'released'`, [dealId]);
    return BigInt(rows[0]?.total ?? '0');
}
/** List the delivery checklist rows for a deal (every row is a required item). */
export async function listDeliveryChecklist(tx, dealId) {
    const { rows } = await tx.query(`SELECT item_key, checked_at FROM delivery_checklists WHERE deal_id = $1`, [dealId]);
    return rows;
}
/** Mark a milestone released under an optimistic guard (only if not already released). */
export async function markMilestoneReleased(tx, milestoneId) {
    const result = await tx.query(`UPDATE deal_milestones SET status = 'released', released_at = now()
       WHERE id = $1 AND status IS DISTINCT FROM 'released'`, [milestoneId]);
    return result.rowCount ?? 0;
}
/** Transition a deal's status under an optimistic guard on its current state. */
export async function setDealStatusFrom(tx, dealId, fromStatus, toStatus) {
    const result = await tx.query(`UPDATE deals SET status = $3::deal_status, last_activity_at = now()
       WHERE id = $1 AND status = $2::deal_status`, [dealId, fromStatus, toStatus]);
    return result.rowCount ?? 0;
}
/**
 * Record a delivery-checklist item as completed (proof submitted). Upserts the
 * `(deal_id, checklist_type, item_key)` row, stamping `checked_by`/`checked_at`
 * so `listDeliveryChecklist` can treat it as done.
 */
export async function markDeliveryChecklistItem(tx, input) {
    const existing = await tx.query(`SELECT id FROM delivery_checklists
       WHERE deal_id = $1 AND checklist_type = $2 AND item_key = $3
       LIMIT 1`, [input.dealId, input.checklistType, input.itemKey]);
    if (existing.rows[0]) {
        await tx.query(`UPDATE delivery_checklists SET checked_by = $2, checked_at = now() WHERE id = $1`, [existing.rows[0].id, input.checkedBy]);
        return;
    }
    await tx.query(`INSERT INTO delivery_checklists (deal_id, checklist_type, item_key, checked_by, checked_at)
     VALUES ($1, $2, $3, $4, now())`, [input.dealId, input.checklistType, input.itemKey, input.checkedBy]);
}
//# sourceMappingURL=milestone.repository.js.map