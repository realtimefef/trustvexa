/**
 * Extended operator (admin == middleman) Trust & Safety / Compliance service.
 *
 * Surfaces the remaining plan capabilities over tables that already exist
 * (migrations 1700000500000 / 1700000600000):
 *   - Legal holds (legal_holds + deals.legal_hold) — evidence-preservation mode
 *     that blocks payouts via the existing payout preflight.
 *   - Appeal / unblock requests (appeal_requests) — review + reinstate.
 *   - AML / suspicious-activity alerts (aml_alerts) — feed the risk panel.
 *   - Break-glass / emergency-recovery audit (break_glass_events).
 *   - PII access (users.*_enc decrypted) — every view recorded in
 *     pii_access_logs; the password hash is NEVER read or returned.
 *
 * Every mutation is wrapped in a transaction together with a hash-chained
 * `admin_actions` audit row (appendAdminAction), so an operator action can
 * never apply without a tamper-evident audit entry.
 */
import { query, getClient } from '@trustvexa/shared';

import { AppError, notFound } from '../../errors/app-error.js';
import { openPii } from '../crypto/key-provider.js';
import { appendAdminAction } from './enforcement.repository.js';

function toIso(v: Date | string | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

// ── Legal holds ────────────────────────────────────────────────────────────

export interface LegalHoldView {
  id: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  placedBy: string | null;
  placedAt: string | null;
  createdAt: string | null;
}

interface LegalHoldRow {
  id: string; target_type: string; target_id: string | null; reason: string | null;
  placed_by: string | null; placed_at: Date | string | null; created_at: Date | string;
}

export async function listLegalHolds(): Promise<{ holds: LegalHoldView[] }> {
  const { rows } = await query<LegalHoldRow>(
    `SELECT id, target_type, target_id, reason, placed_by, placed_at, created_at
       FROM legal_holds WHERE released_at IS NULL ORDER BY created_at DESC LIMIT 200`,
  );
  return {
    holds: rows.map((r) => ({
      id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason,
      placedBy: r.placed_by, placedAt: toIso(r.placed_at), createdAt: toIso(r.created_at),
    })),
  };
}

export async function placeLegalHold(input: {
  actorId: string; targetType: 'deal' | 'user'; targetId: string; reason: string; requestId: string;
}): Promise<{ id: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: string }>(
      `INSERT INTO legal_holds (target_type, target_id, reason, placed_by, placed_at, created_at)
       VALUES ($1, $2, $3, $4, now(), now()) RETURNING id`,
      [input.targetType, input.targetId, input.reason, input.actorId],
    );
    if (input.targetType === 'deal') {
      await client.query(`UPDATE deals SET legal_hold = true WHERE id = $1`, [input.targetId]);
    }
    await appendAdminAction(client, {
      actorId: input.actorId, action: 'legal_hold_placed', targetType: input.targetType,
      targetId: input.targetId, reason: input.reason, requestId: input.requestId, metadata: {},
    });
    await client.query('COMMIT');
    return { id: ins.rows[0]!.id };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

export async function releaseLegalHold(input: {
  actorId: string; holdId: string; reason: string; requestId: string;
}): Promise<{ released: boolean }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const h = await client.query<{ target_type: string; target_id: string | null }>(
      `SELECT target_type, target_id FROM legal_holds WHERE id = $1 AND released_at IS NULL FOR UPDATE`,
      [input.holdId],
    );
    const row = h.rows[0];
    if (!row) throw notFound('Legal hold not found or already released.');
    await client.query(
      `UPDATE legal_holds SET released_at = now(), released_by = $2 WHERE id = $1`,
      [input.holdId, input.actorId],
    );
    if (row.target_type === 'deal' && row.target_id) {
      const remaining = await client.query(
        `SELECT 1 FROM legal_holds WHERE target_type = 'deal' AND target_id = $1 AND released_at IS NULL LIMIT 1`,
        [row.target_id],
      );
      if (remaining.rows.length === 0) {
        await client.query(`UPDATE deals SET legal_hold = false WHERE id = $1`, [row.target_id]);
      }
    }
    await appendAdminAction(client, {
      actorId: input.actorId, action: 'legal_hold_released', targetType: row.target_type,
      targetId: row.target_id ?? '', reason: input.reason, requestId: input.requestId,
      metadata: { holdId: input.holdId },
    });
    await client.query('COMMIT');
    return { released: true };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// ── Appeals / unblock requests ───────────────────────────────────────────────

export interface AppealView {
  id: string; userId: string; username: string | null; restrictionType: string | null;
  reason: string | null; status: string | null; decisionReason: string | null;
  decidedAt: string | null; createdAt: string | null;
}

interface AppealRow {
  id: string; user_id: string; username: string | null; restriction_type: string | null;
  reason_enc: string | null; status: string | null; decision_reason: string | null;
  decided_at: Date | string | null; created_at: Date | string;
}

export async function listAppeals(status?: string): Promise<{ appeals: AppealView[] }> {
  const base = `SELECT a.id, a.user_id, u.username, a.restriction_type, a.reason_enc, a.status,
                       a.decision_reason, a.decided_at, a.created_at
                  FROM appeal_requests a JOIN users u ON u.id = a.user_id`;
  const { rows } = status
    ? await query<AppealRow>(`${base} WHERE a.status = $1 ORDER BY a.created_at DESC LIMIT 200`, [status])
    : await query<AppealRow>(`${base} ORDER BY a.created_at DESC LIMIT 200`);
  const appeals = await Promise.all(
    rows.map(async (r) => ({
      id: r.id, userId: r.user_id, username: r.username, restrictionType: r.restriction_type,
      reason: await openPii(r.reason_enc), status: r.status, decisionReason: r.decision_reason,
      decidedAt: toIso(r.decided_at), createdAt: toIso(r.created_at),
    })),
  );
  return { appeals };
}

export async function decideAppeal(input: {
  actorId: string; appealId: string; decision: 'approved' | 'rejected'; decisionReason: string; requestId: string;
}): Promise<{ decided: boolean; decision: string }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const a = await client.query<{ user_id: string; status: string | null }>(
      `SELECT user_id, status FROM appeal_requests WHERE id = $1 FOR UPDATE`,
      [input.appealId],
    );
    const row = a.rows[0];
    if (!row) throw notFound('Appeal not found.');
    if (row.status === 'approved' || row.status === 'rejected') {
      throw new AppError('appeal_decided', 'This appeal has already been decided.', 409);
    }
    await client.query(
      `UPDATE appeal_requests SET status = $2, decision_reason = $3, decided_by = $4, decided_at = now() WHERE id = $1`,
      [input.appealId, input.decision, input.decisionReason, input.actorId],
    );
    if (input.decision === 'approved') {
      // Reinstate the user (lift block / deactivation / review).
      await client.query(
        `UPDATE users SET account_status = 'active'
          WHERE id = $1 AND account_status IN ('blocked', 'deactivated', 'under_review')`,
        [row.user_id],
      );
    }
    await appendAdminAction(client, {
      actorId: input.actorId, action: `appeal_${input.decision}`, targetType: 'user',
      targetId: row.user_id, reason: input.decisionReason, requestId: input.requestId,
      metadata: { appealId: input.appealId },
    });
    await client.query('COMMIT');
    return { decided: true, decision: input.decision };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// ── AML / suspicious-activity alerts ─────────────────────────────────────────

export interface AmlAlertView {
  id: string; userId: string | null; username: string | null; dealId: string | null;
  patternType: string | null; severity: string | null; details: string | null;
  status: string | null; createdAt: string | null;
}

interface AmlAlertRow {
  id: string; user_id: string | null; username: string | null; deal_id: string | null;
  pattern_type: string | null; severity: string | null; details: string | null;
  status: string | null; created_at: Date | string;
}

function toAmlView(r: AmlAlertRow): AmlAlertView {
  return {
    id: r.id, userId: r.user_id, username: r.username, dealId: r.deal_id,
    patternType: r.pattern_type, severity: r.severity, details: r.details,
    status: r.status, createdAt: toIso(r.created_at),
  };
}

export async function listAmlAlerts(status?: string): Promise<{ alerts: AmlAlertView[] }> {
  const base = `SELECT al.id, al.user_id, u.username, al.deal_id, al.pattern_type, al.severity,
                       al.details, al.status, al.created_at
                  FROM aml_alerts al LEFT JOIN users u ON u.id = al.user_id`;
  const { rows } = status
    ? await query<AmlAlertRow>(`${base} WHERE al.status = $1 ORDER BY al.created_at DESC LIMIT 200`, [status])
    : await query<AmlAlertRow>(`${base} ORDER BY al.created_at DESC LIMIT 200`);
  return { alerts: rows.map(toAmlView) };
}

export async function listAmlAlertsForDeal(dealId: string): Promise<{ alerts: AmlAlertView[] }> {
  const { rows } = await query<AmlAlertRow>(
    `SELECT al.id, al.user_id, u.username, al.deal_id, al.pattern_type, al.severity,
            al.details, al.status, al.created_at
       FROM aml_alerts al LEFT JOIN users u ON u.id = al.user_id
      WHERE al.deal_id = $1 ORDER BY al.created_at DESC LIMIT 50`,
    [dealId],
  );
  return { alerts: rows.map(toAmlView) };
}

export async function updateAmlAlert(input: {
  actorId: string; alertId: string; status: string; requestId: string;
}): Promise<{ updated: boolean }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const found = await client.query<{ user_id: string | null }>(
      `SELECT user_id FROM aml_alerts WHERE id = $1 FOR UPDATE`, [input.alertId],
    );
    if (!found.rows[0]) throw notFound('AML alert not found.');
    await client.query(`UPDATE aml_alerts SET status = $2 WHERE id = $1`, [input.alertId, input.status]);
    await appendAdminAction(client, {
      actorId: input.actorId, action: 'aml_alert_status', targetType: 'user',
      targetId: found.rows[0].user_id ?? '', reason: `AML alert -> ${input.status}`,
      requestId: input.requestId, metadata: { alertId: input.alertId, status: input.status },
    });
    await client.query('COMMIT');
    return { updated: true };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// ── Break-glass / emergency recovery audit ───────────────────────────────────

export interface BreakGlassView {
  id: string; actorLabel: string | null; action: string | null; reason: string | null; createdAt: string | null;
}

export async function listBreakGlass(): Promise<{ events: BreakGlassView[] }> {
  const { rows } = await query<{ id: string; actor_label: string | null; action: string | null; reason: string | null; created_at: Date | string }>(
    `SELECT id, actor_label, action, reason, created_at FROM break_glass_events ORDER BY created_at DESC LIMIT 100`,
  );
  return {
    events: rows.map((r) => ({
      id: r.id, actorLabel: r.actor_label, action: r.action, reason: r.reason, createdAt: toIso(r.created_at),
    })),
  };
}

const BREAK_GLASS_ACTIONS = new Set(['recovery_initiated', 'access_restored', 'procedure_tested']);

export async function recordBreakGlass(input: {
  actorId: string; actorLabel: string; action: string; reason: string; requestId: string;
}): Promise<{ id: string }> {
  if (!BREAK_GLASS_ACTIONS.has(input.action)) {
    throw new AppError('invalid_action', 'Unknown break-glass action.', 422);
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: string }>(
      `INSERT INTO break_glass_events (actor_label, action, reason, created_at)
       VALUES ($1, $2, $3, now()) RETURNING id`,
      [input.actorLabel, input.action, input.reason],
    );
    await appendAdminAction(client, {
      actorId: input.actorId, action: `break_glass_${input.action}`, targetType: 'system',
      targetId: ins.rows[0]!.id, reason: input.reason, requestId: input.requestId,
      metadata: { actorLabel: input.actorLabel },
    });
    await client.query('COMMIT');
    return { id: ins.rows[0]!.id };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

// ── PII access (audited decrypt) ─────────────────────────────────────────────

const PII_FIELDS = new Set(['email', 'signup_details', 'recovery_email']);

export interface PiiLookupResult {
  userId: string;
  username: string | null;
  values: Array<{ field: string; value: string | null }>;
}

export async function lookupUserPii(input: {
  actorId: string; targetUserId: string; fields: string[]; reason: string;
}): Promise<PiiLookupResult> {
  const fields = input.fields.filter((f) => PII_FIELDS.has(f));
  if (fields.length === 0) throw new AppError('invalid_fields', 'No valid PII fields requested.', 422);

  const { rows } = await query<{
    username: string | null; email_enc: string | null; signup_details_enc: string | null; recovery_email_enc: string | null;
  }>(
    `SELECT username, email_enc, signup_details_enc, recovery_email_enc FROM users WHERE id = $1`,
    [input.targetUserId],
  );
  const u = rows[0];
  if (!u) throw notFound('User not found.');

  const values: Array<{ field: string; value: string | null }> = [];
  const client = await getClient();
  try {
    for (const f of fields) {
      let val: string | null = null;
      if (f === 'email') val = await openPii(u.email_enc);
      else if (f === 'signup_details') val = await openPii(u.signup_details_enc);
      else if (f === 'recovery_email') val = await openPii(u.recovery_email_enc);
      values.push({ field: f, value: val });
      // Audit EVERY decrypt/view to pii_access_logs (Plan: PII access is logged).
      await client.query(
        `INSERT INTO pii_access_logs (actor_id, target_user_id, field_type, reason, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [input.actorId, input.targetUserId, f, input.reason],
      );
    }
  } finally { client.release(); }

  return { userId: input.targetUserId, username: u.username, values };
}

export interface PiiAccessLogView {
  id: string; actorId: string | null; targetUserId: string | null; dealId: string | null;
  fieldType: string | null; reason: string | null; createdAt: string | null;
}

export async function listPiiAccessLogs(targetUserId?: string): Promise<{ logs: PiiAccessLogView[] }> {
  const base = `SELECT id, actor_id, target_user_id, deal_id, field_type, reason, created_at FROM pii_access_logs`;
  const { rows } = targetUserId
    ? await query<{ id: string; actor_id: string | null; target_user_id: string | null; deal_id: string | null; field_type: string | null; reason: string | null; created_at: Date | string }>(
        `${base} WHERE target_user_id = $1 ORDER BY created_at DESC LIMIT 100`, [targetUserId])
    : await query<{ id: string; actor_id: string | null; target_user_id: string | null; deal_id: string | null; field_type: string | null; reason: string | null; created_at: Date | string }>(
        `${base} ORDER BY created_at DESC LIMIT 100`);
  return {
    logs: rows.map((r) => ({
      id: r.id, actorId: r.actor_id, targetUserId: r.target_user_id, dealId: r.deal_id,
      fieldType: r.field_type, reason: r.reason, createdAt: toIso(r.created_at),
    })),
  };
}

// ── Withdrawal allowlist (custody: operator payout addresses, time-delayed) ───

export interface AllowlistEntryView {
  id: string; coin: string | null; network: string | null; address: string | null;
  label: string | null; isActive: boolean; activeFrom: string | null; createdAt: string | null;
}

interface AllowlistRow {
  id: string; coin: string | null; network: string | null; address: string | null;
  label: string | null; is_active: boolean; active_from: Date | string | null; created_at: Date | string;
}

export async function listWithdrawalAllowlist(): Promise<{ entries: AllowlistEntryView[]; nowIso: string }> {
  const { rows } = await query<AllowlistRow>(
    `SELECT id, coin, network, address, label, is_active, active_from, created_at
       FROM withdrawal_allowlist ORDER BY created_at DESC LIMIT 200`,
  );
  return {
    nowIso: new Date().toISOString(),
    entries: rows.map((r) => ({
      id: r.id, coin: r.coin, network: r.network, address: r.address, label: r.label,
      isActive: r.is_active, activeFrom: toIso(r.active_from), createdAt: toIso(r.created_at),
    })),
  };
}

/**
 * Add a payout/withdrawal address to the allowlist with a time-delay before it
 * becomes usable (custody control). The payout preflight only allows sending to
 * an active allowlist entry whose active_from has elapsed.
 */
export async function addWithdrawalAllowlist(input: {
  actorId: string; coin: string; network: string; address: string; label: string | null; delayHours: number; requestId: string;
}): Promise<{ id: string; activeFrom: string }> {
  const delayHours = Math.max(0, Math.min(168, input.delayHours)); // clamp 0–7 days
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: string; active_from: Date | string }>(
      `INSERT INTO withdrawal_allowlist (coin, network, address, label, added_by, added_at, active_from, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, now(), now() + ($6 || ' hours')::interval, true, now())
       RETURNING id, active_from`,
      [input.coin, input.network, input.address.trim(), input.label, input.actorId, String(delayHours)],
    );
    await appendAdminAction(client, {
      actorId: input.actorId, action: 'allowlist_address_added', targetType: 'wallet',
      targetId: ins.rows[0]!.id, reason: `Allowlist ${input.coin}/${input.network} ${input.address}`,
      requestId: input.requestId, metadata: { coin: input.coin, network: input.network, delayHours },
    });
    await client.query('COMMIT');
    return { id: ins.rows[0]!.id, activeFrom: toIso(ins.rows[0]!.active_from) ?? '' };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}

export async function setWithdrawalAllowlistActive(input: {
  actorId: string; id: string; isActive: boolean; requestId: string;
}): Promise<{ updated: boolean }> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT 1 FROM withdrawal_allowlist WHERE id = $1 FOR UPDATE`, [input.id]);
    if (found.rows.length === 0) throw notFound('Allowlist entry not found.');
    await client.query(`UPDATE withdrawal_allowlist SET is_active = $2 WHERE id = $1`, [input.id, input.isActive]);
    await appendAdminAction(client, {
      actorId: input.actorId, action: input.isActive ? 'allowlist_address_enabled' : 'allowlist_address_revoked',
      targetType: 'wallet', targetId: input.id, reason: input.isActive ? 'Allowlist enabled' : 'Allowlist revoked',
      requestId: input.requestId, metadata: {},
    });
    await client.query('COMMIT');
    return { updated: true };
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
}
