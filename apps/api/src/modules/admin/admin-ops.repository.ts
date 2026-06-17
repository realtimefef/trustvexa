/**
 * Data access for the extended middleman/admin operations surface
 * (Plan §25/§33/§4): deal & user search, analytics snapshots, manual holds,
 * admin overrides, private notes, emergency pauses and feature flags.
 *
 * Reads run against the shared pool via `query`. Audited writes are executed by
 * the service inside a single transaction together with a hash-chained
 * `admin_actions` row (`appendAdminAction`), so the audited mutation and its
 * tamper-evident audit entry always commit atomically.
 *
 * Every column referenced here exists in the migrations verbatim — money
 * columns are `bigint` and pass through as decimal strings unchanged, and
 * encrypted `*_enc` columns are read/written as-is (envelope encryption is wired
 * in a later task). Password hashes and PII `*_enc` columns are never selected
 * for the user search. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';

import type { TxClient } from './enforcement.repository.js';
import type { DealStatus } from '../deal/state-machine.js';
import type { PauseScope } from '../launch/emergency-pause.js';
import type { FlagScope } from '../launch/feature-flags.js';

// ── Deal search ───────────────────────────────────────────────────────────────

export interface DealSearchRow {
  id: string;
  status: DealStatus;
  risk_score: number | null;
  deal_amount: string | null;
  coin: string;
  network: string;
  is_practice: boolean;
  hold_status: string | null;
  legal_hold: boolean;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  last_activity_at: Date | string | null;
  created_at: Date | string;
}

export interface DealSearchFilters {
  status?: string;
  minRisk?: number;
  q?: string;
  limit: number;
}

/** Search/filter deals by status, minimum risk score and free text on id/coin. */
export async function searchDeals(filters: DealSearchFilters): Promise<DealSearchRow[]> {
  const conds: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.status !== undefined && filters.status !== '') {
    conds.push(`status::text = $${i++}`);
    params.push(filters.status);
  }
  if (filters.minRisk !== undefined) {
    conds.push(`risk_score >= $${i++}`);
    params.push(filters.minRisk);
  }
  if (filters.q !== undefined && filters.q !== '') {
    conds.push(`(CAST(id AS text) ILIKE $${i} OR coin ILIKE $${i})`);
    params.push(`%${filters.q}%`);
    i++;
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(filters.limit);
  const res = await query<DealSearchRow>(
    `SELECT id, status, risk_score, deal_amount, coin, network, is_practice,
            hold_status, legal_hold, buyer_id, seller_id, middleman_id,
            last_activity_at, created_at
       FROM deals
       ${where}
      ORDER BY COALESCE(last_activity_at, updated_at, created_at) DESC
      LIMIT $${i}`,
    params,
  );
  return res.rows;
}

// ── User search ─────────────────────────────────────────────────────────────

export interface UserSearchRow {
  id: string;
  username: string;
  account_type: string;
  account_status: string;
  account_label: string;
  trust_level: number;
  legal_hold: boolean;
  created_at: Date | string;
}

export interface UserSearchFilters {
  q?: string;
  status?: string;
  label?: string;
  limit: number;
}

/**
 * Search/filter users. Never selects `password_hash` and never selects/decrypts
 * the `*_enc` PII columns — only non-sensitive account metadata is returned.
 */
export async function searchUsers(filters: UserSearchFilters): Promise<UserSearchRow[]> {
  const conds: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (filters.q !== undefined && filters.q !== '') {
    conds.push(`username ILIKE $${i++}`);
    params.push(`%${filters.q}%`);
  }
  if (filters.status !== undefined && filters.status !== '') {
    conds.push(`account_status::text = $${i++}`);
    params.push(filters.status);
  }
  if (filters.label !== undefined && filters.label !== '') {
    conds.push(`account_label::text = $${i++}`);
    params.push(filters.label);
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
  params.push(filters.limit);
  const res = await query<UserSearchRow>(
    `SELECT id, username, account_type, account_status, account_label,
            trust_level, legal_hold, created_at
       FROM users
       ${where}
      ORDER BY created_at DESC
      LIMIT $${i}`,
    params,
  );
  return res.rows;
}

// ── Analytics snapshots ───────────────────────────────────────────────────────

export interface AnalyticsSnapshotRow {
  id: string;
  snapshot_date: Date | string | null;
  total_deals: number | null;
  active_deals: number | null;
  completed_deals: number | null;
  disputed_deals: number | null;
  refunded_amount: string | null;
  released_amount: string | null;
  avg_completion_time: string | null;
  common_dispute_reason: string | null;
  payment_issue_count: number | null;
  created_at: Date | string;
}

export interface FraudAnalyticsSnapshotRow {
  id: string;
  snapshot_date: Date | string | null;
  repeated_wrong_network_count: number | null;
  repeated_dispute_count: number | null;
  failed_code_burst_count: number | null;
  new_device_wallet_change_count: number | null;
  high_risk_wallet_count: number | null;
  blocked_user_count: number | null;
  created_at: Date | string;
}

/** Latest analytics snapshot (most recent snapshot_date), or null when none. */
export async function getLatestAnalyticsSnapshot(): Promise<AnalyticsSnapshotRow | null> {
  const res = await query<AnalyticsSnapshotRow>(
    `SELECT id, snapshot_date, total_deals, active_deals, completed_deals,
            disputed_deals, refunded_amount, released_amount, avg_completion_time,
            common_dispute_reason, payment_issue_count, created_at
       FROM analytics_snapshots
      ORDER BY snapshot_date DESC NULLS LAST, created_at DESC
      LIMIT 1`,
  );
  return res.rows[0] ?? null;
}

/** Latest fraud analytics snapshot, or null when none. */
export async function getLatestFraudAnalyticsSnapshot(): Promise<FraudAnalyticsSnapshotRow | null> {
  const res = await query<FraudAnalyticsSnapshotRow>(
    `SELECT id, snapshot_date, repeated_wrong_network_count, repeated_dispute_count,
            failed_code_burst_count, new_device_wallet_change_count,
            high_risk_wallet_count, blocked_user_count, created_at
       FROM fraud_analytics_snapshots
      ORDER BY snapshot_date DESC NULLS LAST, created_at DESC
      LIMIT 1`,
  );
  return res.rows[0] ?? null;
}

// ── Manual holds (deal_holds) ─────────────────────────────────────────────────

export interface HoldRow {
  id: string;
  deal_id: string;
  hold_type: string | null;
  reason: string | null;
  visible_message: string | null;
  user_next_action: string | null;
  estimated_next_step_at: Date | string | null;
  started_by: string | null;
  released_by: string | null;
  created_at: Date | string;
}

/** Active holds = rows that have not yet been released (`released_by IS NULL`). */
export async function listActiveHolds(limit: number): Promise<HoldRow[]> {
  const res = await query<HoldRow>(
    `SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds
      WHERE released_by IS NULL
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
}

/** Active hold of a given type on a deal, for idempotent placement. */
export async function findActiveHold(
  tx: TxClient,
  dealId: string,
  holdType: string,
): Promise<HoldRow | null> {
  const { rows } = await tx.query<HoldRow>(
    `SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds
      WHERE deal_id = $1 AND hold_type = $2 AND released_by IS NULL
      LIMIT 1`,
    [dealId, holdType],
  );
  return rows[0] ?? null;
}

export async function insertHold(
  tx: TxClient,
  input: {
    dealId: string;
    holdType: string;
    reason: string;
    visibleMessage: string | null;
    startedBy: string;
  },
): Promise<HoldRow> {
  const { rows } = await tx.query<HoldRow>(
    `INSERT INTO deal_holds (deal_id, hold_type, reason, visible_message, started_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, deal_id, hold_type, reason, visible_message, user_next_action,
               estimated_next_step_at, started_by, released_by, created_at`,
    [input.dealId, input.holdType, input.reason, input.visibleMessage, input.startedBy],
  );
  const row = rows[0];
  if (!row) throw new Error('insertHold returned no row');
  return row;
}

export async function getHoldById(tx: TxClient, holdId: string): Promise<HoldRow | null> {
  const { rows } = await tx.query<HoldRow>(
    `SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds WHERE id = $1 LIMIT 1`,
    [holdId],
  );
  return rows[0] ?? null;
}

/** Release a hold; updates only when still active. Returns the updated row. */
export async function releaseHold(
  tx: TxClient,
  holdId: string,
  releasedBy: string,
): Promise<HoldRow | null> {
  const { rows } = await tx.query<HoldRow>(
    `UPDATE deal_holds SET released_by = $2
      WHERE id = $1 AND released_by IS NULL
      RETURNING id, deal_id, hold_type, reason, visible_message, user_next_action,
                estimated_next_step_at, started_by, released_by, created_at`,
    [holdId, releasedBy],
  );
  return rows[0] ?? null;
}

// ── Admin overrides (admin_overrides) ─────────────────────────────────────────

export interface OverrideRow {
  id: string;
  actor_id: string | null;
  deal_id: string | null;
  override_type: string | null;
  old_value: string | null;
  new_value: string | null;
  reason: string | null;
  confirmed_at: Date | string | null;
  created_at: Date | string;
}

/** List overrides, optionally scoped to one deal. */
export async function listOverrides(dealId?: string): Promise<OverrideRow[]> {
  if (dealId !== undefined) {
    const res = await query<OverrideRow>(
      `SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
              confirmed_at, created_at
         FROM admin_overrides
        WHERE deal_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [dealId],
    );
    return res.rows;
  }
  const res = await query<OverrideRow>(
    `SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
            confirmed_at, created_at
       FROM admin_overrides
      ORDER BY created_at DESC
      LIMIT 200`,
  );
  return res.rows;
}

/** A matching override, for idempotent recording of the same correction. */
export async function findOverride(
  tx: TxClient,
  input: { dealId: string; overrideType: string; oldValue: string; newValue: string },
): Promise<OverrideRow | null> {
  const { rows } = await tx.query<OverrideRow>(
    `SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
            confirmed_at, created_at
       FROM admin_overrides
      WHERE deal_id = $1 AND override_type = $2 AND old_value = $3 AND new_value = $4
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.dealId, input.overrideType, input.oldValue, input.newValue],
  );
  return rows[0] ?? null;
}

export async function insertOverride(
  tx: TxClient,
  input: {
    actorId: string;
    dealId: string;
    overrideType: string;
    oldValue: string;
    newValue: string;
    reason: string;
  },
): Promise<OverrideRow> {
  const { rows } = await tx.query<OverrideRow>(
    `INSERT INTO admin_overrides
       (actor_id, deal_id, override_type, old_value, new_value, reason, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id, actor_id, deal_id, override_type, old_value, new_value, reason,
               confirmed_at, created_at`,
    [input.actorId, input.dealId, input.overrideType, input.oldValue, input.newValue, input.reason],
  );
  const row = rows[0];
  if (!row) throw new Error('insertOverride returned no row');
  return row;
}

// ── Private admin notes (admin_notes) ──────────────────────────────────────────

export interface NoteRow {
  id: string;
  target_type: string | null;
  target_id: string | null;
  note_enc: string | null;
  created_by: string | null;
  created_at: Date | string;
}

export async function listNotes(targetType: string, targetId: string): Promise<NoteRow[]> {
  const res = await query<NoteRow>(
    `SELECT id, target_type, target_id, note_enc, created_by, created_at
       FROM admin_notes
      WHERE target_type = $1 AND target_id = $2
      ORDER BY created_at DESC
      LIMIT 200`,
    [targetType, targetId],
  );
  return res.rows;
}

/** A note with identical content by the same author, for idempotent adds. */
export async function findNote(
  tx: TxClient,
  input: { targetType: string; targetId: string; noteEnc: string; createdBy: string },
): Promise<NoteRow | null> {
  const { rows } = await tx.query<NoteRow>(
    `SELECT id, target_type, target_id, note_enc, created_by, created_at
       FROM admin_notes
      WHERE target_type = $1 AND target_id = $2 AND note_enc = $3 AND created_by = $4
      ORDER BY created_at DESC
      LIMIT 1`,
    [input.targetType, input.targetId, input.noteEnc, input.createdBy],
  );
  return rows[0] ?? null;
}

export async function insertNote(
  tx: TxClient,
  input: { targetType: string; targetId: string; noteEnc: string; createdBy: string },
): Promise<NoteRow> {
  // `note_enc` stores the note as-is for now; envelope encryption is wired in a
  // later task (mirrors the `*_enc` convention used by admin-setting.service).
  const { rows } = await tx.query<NoteRow>(
    `INSERT INTO admin_notes (target_type, target_id, note_enc, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, target_type, target_id, note_enc, created_by, created_at`,
    [input.targetType, input.targetId, input.noteEnc, input.createdBy],
  );
  const row = rows[0];
  if (!row) throw new Error('insertNote returned no row');
  return row;
}

// ── Emergency pauses (incident_pauses) ─────────────────────────────────────────
// NOTE: the existing `incident-pause.repository.ts` references a `chain` column
// that does not exist in the `incident_pauses` migration, so these queries use
// only the real columns (scope, reason, started_by, started_at, ended_by,
// ended_at). The `chain` scope value is still accepted via the `scope` column.

export interface PauseRow {
  id: string;
  scope: string;
  reason: string | null;
  started_by: string | null;
  started_at: Date | string | null;
  ended_by: string | null;
  ended_at: Date | string | null;
}

export async function listActivePauses(): Promise<PauseRow[]> {
  const res = await query<PauseRow>(
    `SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses
      WHERE ended_at IS NULL
      ORDER BY started_at DESC NULLS LAST`,
  );
  return res.rows;
}

/** Active pause for a scope, for idempotent start. */
export async function findActivePauseByScope(
  tx: TxClient,
  scope: PauseScope,
): Promise<PauseRow | null> {
  const { rows } = await tx.query<PauseRow>(
    `SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses
      WHERE scope = $1 AND ended_at IS NULL
      ORDER BY started_at DESC NULLS LAST
      LIMIT 1`,
    [scope],
  );
  return rows[0] ?? null;
}

export async function insertPause(
  tx: TxClient,
  input: { scope: PauseScope; reason: string; startedBy: string },
): Promise<PauseRow> {
  const { rows } = await tx.query<PauseRow>(
    `INSERT INTO incident_pauses (scope, reason, started_by, started_at)
     VALUES ($1, $2, $3, now())
     RETURNING id, scope, reason, started_by, started_at, ended_by, ended_at`,
    [input.scope, input.reason, input.startedBy],
  );
  const row = rows[0];
  if (!row) throw new Error('insertPause returned no row');
  return row;
}

export async function getPauseById(tx: TxClient, pauseId: string): Promise<PauseRow | null> {
  const { rows } = await tx.query<PauseRow>(
    `SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses WHERE id = $1 LIMIT 1`,
    [pauseId],
  );
  return rows[0] ?? null;
}

/** End a pause; updates only when still active. Returns the updated row. */
export async function endPauseById(
  tx: TxClient,
  pauseId: string,
  endedBy: string,
): Promise<PauseRow | null> {
  const { rows } = await tx.query<PauseRow>(
    `UPDATE incident_pauses SET ended_by = $2, ended_at = now()
      WHERE id = $1 AND ended_at IS NULL
      RETURNING id, scope, reason, started_by, started_at, ended_by, ended_at`,
    [pauseId, endedBy],
  );
  return rows[0] ?? null;
}

// ── Feature flags (feature_flags) ──────────────────────────────────────────────

export interface FeatureFlagRow {
  id: string;
  flag_key: string;
  description: string | null;
  is_enabled: boolean;
  scope: FlagScope | null;
  updated_by: string | null;
  created_at: Date | string;
}

export async function listFeatureFlags(): Promise<FeatureFlagRow[]> {
  const res = await query<FeatureFlagRow>(
    `SELECT id, flag_key, description, is_enabled, scope, updated_by, created_at
       FROM feature_flags
      ORDER BY flag_key ASC`,
  );
  return res.rows;
}

export async function getFeatureFlag(tx: TxClient, key: string): Promise<FeatureFlagRow | null> {
  const { rows } = await tx.query<FeatureFlagRow>(
    `SELECT id, flag_key, description, is_enabled, scope, updated_by, created_at
       FROM feature_flags WHERE flag_key = $1 LIMIT 1`,
    [key],
  );
  return rows[0] ?? null;
}

/** Toggle a flag's enabled state, preserving description/scope. */
export async function updateFeatureFlag(
  tx: TxClient,
  input: { key: string; isEnabled: boolean; updatedBy: string },
): Promise<FeatureFlagRow | null> {
  const { rows } = await tx.query<FeatureFlagRow>(
    `UPDATE feature_flags SET is_enabled = $2, updated_by = $3
      WHERE flag_key = $1
      RETURNING id, flag_key, description, is_enabled, scope, updated_by, created_at`,
    [input.key, input.isEnabled, input.updatedBy],
  );
  return rows[0] ?? null;
}

export interface AuditActionRow {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  requires_confirmation: boolean;
  request_id: string;
  metadata: Record<string, unknown> | null;
  prev_hash: string;
  entry_hash: string;
  created_at: Date | string;
}

export async function listAuditLogs(limit: number): Promise<AuditActionRow[]> {
  const res = await query<AuditActionRow>(
    `SELECT id, actor_id, action, target_type, target_id, reason, requires_confirmation,
            request_id, metadata, prev_hash, entry_hash, created_at
       FROM admin_actions
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
}

export interface AnnouncementRow {
  id: string;
  title: string | null;
  body: string | null;
  audience: string | null;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  created_at: Date | string;
}

export async function insertAnnouncement(
  tx: TxClient,
  input: {
    title: string;
    body: string;
    audience: string;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  },
): Promise<AnnouncementRow> {
  const { rows } = await tx.query<AnnouncementRow>(
    `INSERT INTO announcements (title, body, audience, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, body, audience, starts_at, ends_at, created_at`,
    [input.title, input.body, input.audience, input.startsAt ?? null, input.endsAt ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error('insertAnnouncement returned no row');
  return row;
}

export interface ChatSearchRow {
  id: string;
  deal_id: string;
  type: string;
  status: string;
  created_at: Date | string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
}

export async function searchChats(limit: number): Promise<ChatSearchRow[]> {
  const res = await query<ChatSearchRow>(
    `SELECT c.id, c.deal_id, c.type, c.status, c.created_at,
            d.buyer_id, d.seller_id, d.middleman_id
       FROM chats c
       JOIN deals d ON d.id = c.deal_id
      ORDER BY c.created_at DESC
      LIMIT $1`,
    [limit],
  );
  return res.rows;
}

export async function deleteChat(tx: TxClient, chatId: string): Promise<boolean> {
  const res = await tx.query(
    `UPDATE chats SET status = 'deleted_by_admin' WHERE id = $1`,
    [chatId],
  );
  return (res.rowCount ?? 0) > 0;
}
