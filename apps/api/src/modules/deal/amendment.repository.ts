/**
 * Data access for amendments and mutual cancellation (task 4.8, Requirement
 * 12). Amendment rows are retained as an immutable history (12.3); approvals
 * are recorded as per-role timestamps. Row-level `FOR UPDATE` locks serialize
 * concurrent approvals. All SQL is parameterized; interpolated identifiers come
 * only from fixed role->column allow-lists, never user input.
 */
import { query } from '@trustvexa/shared';

import type { TxClient } from './deal.repository.js';
import type { DealRole } from './terms.repository.js';

export interface AmendmentDealRow {
  id: string;
  status: string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
}

export async function loadDealForAmendment(dealId: string): Promise<AmendmentDealRow | null> {
  const res = await query<AmendmentDealRow>(
    `SELECT id, status, buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 LIMIT 1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

export interface AmendmentRow {
  id: string;
  deal_id: string;
  requested_by: string | null;
  change_type: string | null;
  old_value: string | null;
  new_value: string | null;
  buyer_approved_at: string | null;
  seller_approved_at: string | null;
  middleman_approved_at: string | null;
  status: string | null;
  created_at: string;
}

const AMENDMENT_COLUMNS = `id, deal_id, requested_by, change_type, old_value, new_value,
  buyer_approved_at, seller_approved_at, middleman_approved_at, status, created_at`;

export async function insertAmendment(
  client: TxClient,
  params: {
    dealId: string;
    requestedBy: string;
    changeType: string;
    oldValue: string | null;
    newValue: string;
  },
): Promise<{ id: string }> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO deal_amendments
       (deal_id, requested_by, change_type, old_value, new_value, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id`,
    [params.dealId, params.requestedBy, params.changeType, params.oldValue, params.newValue],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertAmendment returned no row');
  return row;
}

export async function getAmendment(
  dealId: string,
  amendmentId: string,
): Promise<AmendmentRow | null> {
  const res = await query<AmendmentRow>(
    `SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE id = $1 AND deal_id = $2 LIMIT 1`,
    [amendmentId, dealId],
  );
  return res.rows[0] ?? null;
}

export async function getAmendmentForUpdate(
  client: TxClient,
  dealId: string,
  amendmentId: string,
): Promise<AmendmentRow | null> {
  const res = await client.query<AmendmentRow>(
    `SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE id = $1 AND deal_id = $2 FOR UPDATE`,
    [amendmentId, dealId],
  );
  return res.rows[0] ?? null;
}

export async function listAmendments(dealId: string): Promise<AmendmentRow[]> {
  const res = await query<AmendmentRow>(
    `SELECT ${AMENDMENT_COLUMNS} FROM deal_amendments WHERE deal_id = $1 ORDER BY created_at ASC`,
    [dealId],
  );
  return res.rows;
}

const AMENDMENT_ROLE_COLUMN: Readonly<Record<DealRole, string>> = {
  buyer: 'buyer_approved_at',
  seller: 'seller_approved_at',
  middleman: 'middleman_approved_at',
};

export async function approveAmendmentRole(
  client: TxClient,
  amendmentId: string,
  role: DealRole,
): Promise<void> {
  const column = AMENDMENT_ROLE_COLUMN[role];
  await client.query(
    `UPDATE deal_amendments SET ${column} = now() WHERE id = $1 AND ${column} IS NULL`,
    [amendmentId],
  );
}

export async function setAmendmentStatus(
  client: TxClient,
  amendmentId: string,
  status: string,
): Promise<void> {
  await client.query(`UPDATE deal_amendments SET status = $2 WHERE id = $1`, [amendmentId, status]);
}

// --- Cancellations -------------------------------------------------------

export interface CancellationRow {
  id: string;
  deal_id: string;
  requested_by: string | null;
  buyer_approved_at: string | null;
  seller_approved_at: string | null;
  middleman_decision: string | null;
  reason: string | null;
  status: string | null;
  created_at: string;
}

const CANCELLATION_COLUMNS = `id, deal_id, requested_by, buyer_approved_at, seller_approved_at,
  middleman_decision, reason, status, created_at`;

export async function insertCancellation(
  client: TxClient,
  params: { dealId: string; requestedBy: string; reason: string | null; status: string },
): Promise<{ id: string }> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO deal_cancellations (deal_id, requested_by, reason, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [params.dealId, params.requestedBy, params.reason, params.status],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertCancellation returned no row');
  return row;
}

export async function getCancellation(
  dealId: string,
  cancellationId: string,
): Promise<CancellationRow | null> {
  const res = await query<CancellationRow>(
    `SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE id = $1 AND deal_id = $2 LIMIT 1`,
    [cancellationId, dealId],
  );
  return res.rows[0] ?? null;
}

export async function getCancellationForUpdate(
  client: TxClient,
  dealId: string,
  cancellationId: string,
): Promise<CancellationRow | null> {
  const res = await client.query<CancellationRow>(
    `SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE id = $1 AND deal_id = $2 FOR UPDATE`,
    [cancellationId, dealId],
  );
  return res.rows[0] ?? null;
}

export async function listCancellations(dealId: string): Promise<CancellationRow[]> {
  const res = await query<CancellationRow>(
    `SELECT ${CANCELLATION_COLUMNS} FROM deal_cancellations WHERE deal_id = $1 ORDER BY created_at ASC`,
    [dealId],
  );
  return res.rows;
}

const CANCELLATION_ROLE_COLUMN: Readonly<Record<'buyer' | 'seller', string>> = {
  buyer: 'buyer_approved_at',
  seller: 'seller_approved_at',
};

export async function approveCancellationRole(
  client: TxClient,
  cancellationId: string,
  role: 'buyer' | 'seller',
): Promise<void> {
  const column = CANCELLATION_ROLE_COLUMN[role];
  await client.query(
    `UPDATE deal_cancellations SET ${column} = now() WHERE id = $1 AND ${column} IS NULL`,
    [cancellationId],
  );
}

export async function setCancellationStatus(
  client: TxClient,
  cancellationId: string,
  status: string,
): Promise<void> {
  await client.query(`UPDATE deal_cancellations SET status = $2 WHERE id = $1`, [
    cancellationId,
    status,
  ]);
}

export async function setCancellationMiddlemanDecision(
  client: TxClient,
  cancellationId: string,
  decision: string,
  status: string,
): Promise<void> {
  await client.query(
    `UPDATE deal_cancellations SET middleman_decision = $2, status = $3 WHERE id = $1`,
    [cancellationId, decision, status],
  );
}
