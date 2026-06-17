/**
 * Data access for amendments and mutual cancellation (task 4.8, Requirement
 * 12). Amendment rows are retained as an immutable history (12.3); approvals
 * are recorded as per-role timestamps. Row-level `FOR UPDATE` locks serialize
 * concurrent approvals. All SQL is parameterized; interpolated identifiers come
 * only from fixed role->column allow-lists, never user input.
 */
import { query } from '@trustvexa/shared';
export async function loadDealForAmendment(dealId) {
    const res = await query(`SELECT id, status, buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    return res.rows[0] ?? null;
}
const AMENDMENT_COLUMNS = `id, deal_id, requested_by, change_type, old_value, new_value,
  buyer_approved_at, seller_approved_at, middleman_approved_at, status, created_at`;
export async function insertAmendment(client, params) {
    const res = await client.query(`INSERT INTO deal_amendments
       (deal_id, requested_by, change_type, old_value, new_value, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`, [params.dealId, params.requestedBy, params.changeType, params.oldValue, params.newValue]);
    const row = res.rows[0];
    if (!row)
        throw new Error('insertAmendment returned no row');
    return row;
}
export async function getAmendment(dealId, amendmentId) {
    const res = await query(`SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE id = $1 AND deal_id = $2 LIMIT 1`, [amendmentId, dealId]);
    return res.rows[0] ?? null;
}
export async function getAmendmentForUpdate(client, dealId, amendmentId) {
    const res = await client.query(`SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE id = $1 AND deal_id = $2 FOR UPDATE`, [amendmentId, dealId]);
    return res.rows[0] ?? null;
}
export async function listAmendments(dealId) {
    const res = await query(`SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE deal_id = $1 ORDER BY created_at ASC`, [dealId]);
    return res.rows;
}
const AMENDMENT_ROLE_COLUMN = {
    buyer: 'buyer_approved_at',
    seller: 'seller_approved_at',
    middleman: 'middleman_approved_at',
};
export async function approveAmendmentRole(client, amendmentId, role) {
    const column = AMENDMENT_ROLE_COLUMN[role];
    await client.query(`UPDATE deal_amendments SET ${column} = now() WHERE id = $1 AND ${column} IS NULL`, [amendmentId]);
}
export async function setAmendmentStatus(client, amendmentId, status) {
    await client.query(`UPDATE deal_amendments SET status = $2 WHERE id = $1`, [amendmentId, status]);
}
const CANCELLATION_COLUMNS = `id, deal_id, requested_by, buyer_approved_at, seller_approved_at,
  middleman_decision, reason, status, created_at`;
export async function insertCancellation(client, params) {
    const res = await client.query(`INSERT INTO deal_cancellations (deal_id, requested_by, reason, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id`, [params.dealId, params.requestedBy, params.reason, params.status]);
    const row = res.rows[0];
    if (!row)
        throw new Error('insertCancellation returned no row');
    return row;
}
export async function getCancellation(dealId, cancellationId) {
    const res = await query(`SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE id = $1 AND deal_id = $2 LIMIT 1`, [cancellationId, dealId]);
    return res.rows[0] ?? null;
}
export async function getCancellationForUpdate(client, dealId, cancellationId) {
    const res = await client.query(`SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE id = $1 AND deal_id = $2 FOR UPDATE`, [cancellationId, dealId]);
    return res.rows[0] ?? null;
}
export async function listCancellations(dealId) {
    const res = await query(`SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE deal_id = $1 ORDER BY created_at ASC`, [dealId]);
    return res.rows;
}
const CANCELLATION_ROLE_COLUMN = {
    buyer: 'buyer_approved_at',
    seller: 'seller_approved_at',
};
export async function approveCancellationRole(client, cancellationId, role) {
    const column = CANCELLATION_ROLE_COLUMN[role];
    await client.query(`UPDATE deal_cancellations SET ${column} = now() WHERE id = $1 AND ${column} IS NULL`, [cancellationId]);
}
export async function setCancellationStatus(client, cancellationId, status) {
    await client.query(`UPDATE deal_cancellations SET status = $2 WHERE id = $1`, [
        cancellationId,
        status,
    ]);
}
export async function setCancellationMiddlemanDecision(client, cancellationId, decision, status) {
    await client.query(`UPDATE deal_cancellations SET middleman_decision = $2, status = $3 WHERE id = $1`, [cancellationId, decision, status]);
}
//# sourceMappingURL=amendment.repository.js.map