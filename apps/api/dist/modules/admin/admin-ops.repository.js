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
/** Search/filter deals by status, minimum risk score and free text on id/coin. */
export async function searchDeals(filters) {
    const conds = [];
    const params = [];
    let i = 1;
    if (filters.status !== undefined && filters.status !== '') {
        conds.push(`d.status::text = $${i++}`);
        params.push(filters.status);
    }
    if (filters.minRisk !== undefined) {
        conds.push(`d.risk_score >= $${i++}`);
        params.push(filters.minRisk);
    }
    if (filters.q !== undefined && filters.q !== '') {
        conds.push(`(CAST(d.id AS text) ILIKE $${i} OR d.coin ILIKE $${i})`);
        params.push(`%${filters.q}%`);
        i++;
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(filters.limit);
    const res = await query(`SELECT d.id, d.status, d.risk_score, d.deal_amount, d.coin, d.network, d.is_practice,
            d.hold_status, d.legal_hold, d.buyer_id, d.seller_id, d.middleman_id,
            (bu.account_status::text = 'deleted' OR su.account_status::text = 'deleted') AS archived,
            d.last_activity_at, d.created_at
       FROM deals d
       LEFT JOIN users bu ON bu.id = d.buyer_id
       LEFT JOIN users su ON su.id = d.seller_id
       ${where}
      ORDER BY COALESCE(d.last_activity_at, d.updated_at, d.created_at) DESC
      LIMIT $${i}`, params);
    return res.rows;
}
/**
 * Search/filter users. Never selects `password_hash` and never selects/decrypts
 * the `*_enc` PII columns — only non-sensitive account metadata is returned.
 */
export async function searchUsers(filters) {
    // User Management governs buyer/seller accounts only — operator (middleman)
    // accounts are never listed or enforceable here.
    const conds = [`account_type::text = 'user'`];
    const params = [];
    let i = 1;
    if (filters.q !== undefined && filters.q !== '') {
        conds.push(`(username ILIKE $${i} OR id::text ILIKE $${i})`);
        params.push(`%${filters.q}%`);
        i++;
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
    const res = await query(`SELECT id, username, account_type, account_status, account_label,
            trust_level, legal_hold, created_at,
            (SELECT COUNT(*)::int FROM deals d
              WHERE d.buyer_id = users.id OR d.seller_id = users.id OR d.middleman_id = users.id) AS deals_count
       FROM users
       ${where}
      ORDER BY created_at DESC
      LIMIT $${i}`, params);
    return res.rows;
}
/** Latest analytics snapshot (most recent snapshot_date), or null when none. */
export async function getLatestAnalyticsSnapshot() {
    const res = await query(`SELECT id, snapshot_date, total_deals, active_deals, completed_deals,
            disputed_deals, refunded_amount, released_amount, avg_completion_time,
            common_dispute_reason, payment_issue_count, created_at
       FROM analytics_snapshots
      ORDER BY snapshot_date DESC NULLS LAST, created_at DESC
      LIMIT 1`);
    return res.rows[0] ?? null;
}
/** Latest fraud analytics snapshot, or null when none. */
export async function getLatestFraudAnalyticsSnapshot() {
    const res = await query(`SELECT id, snapshot_date, repeated_wrong_network_count, repeated_dispute_count,
            failed_code_burst_count, new_device_wallet_change_count,
            high_risk_wallet_count, blocked_user_count, created_at
       FROM fraud_analytics_snapshots
      ORDER BY snapshot_date DESC NULLS LAST, created_at DESC
      LIMIT 1`);
    return res.rows[0] ?? null;
}
/** Active holds = rows that have not yet been released (`released_by IS NULL`). */
export async function listActiveHolds(limit) {
    const res = await query(`SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds
      WHERE released_by IS NULL
      ORDER BY created_at DESC
      LIMIT $1`, [limit]);
    return res.rows;
}
/** Active hold of a given type on a deal, for idempotent placement. */
export async function findActiveHold(tx, dealId, holdType) {
    const { rows } = await tx.query(`SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds
      WHERE deal_id = $1 AND hold_type = $2 AND released_by IS NULL
      LIMIT 1`, [dealId, holdType]);
    return rows[0] ?? null;
}
export async function insertHold(tx, input) {
    const { rows } = await tx.query(`INSERT INTO deal_holds (deal_id, hold_type, reason, visible_message, started_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, deal_id, hold_type, reason, visible_message, user_next_action,
               estimated_next_step_at, started_by, released_by, created_at`, [input.dealId, input.holdType, input.reason, input.visibleMessage, input.startedBy]);
    const row = rows[0];
    if (!row)
        throw new Error('insertHold returned no row');
    return row;
}
export async function getHoldById(tx, holdId) {
    const { rows } = await tx.query(`SELECT id, deal_id, hold_type, reason, visible_message, user_next_action,
            estimated_next_step_at, started_by, released_by, created_at
       FROM deal_holds WHERE id = $1 LIMIT 1`, [holdId]);
    return rows[0] ?? null;
}
/** Release a hold; updates only when still active. Returns the updated row. */
export async function releaseHold(tx, holdId, releasedBy) {
    const { rows } = await tx.query(`UPDATE deal_holds SET released_by = $2
      WHERE id = $1 AND released_by IS NULL
      RETURNING id, deal_id, hold_type, reason, visible_message, user_next_action,
                estimated_next_step_at, started_by, released_by, created_at`, [holdId, releasedBy]);
    return rows[0] ?? null;
}
/** List overrides, optionally scoped to one deal. */
export async function listOverrides(dealId) {
    if (dealId !== undefined) {
        const res = await query(`SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
              confirmed_at, created_at
         FROM admin_overrides
        WHERE deal_id = $1
        ORDER BY created_at DESC
        LIMIT 200`, [dealId]);
        return res.rows;
    }
    const res = await query(`SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
            confirmed_at, created_at
       FROM admin_overrides
      ORDER BY created_at DESC
      LIMIT 200`);
    return res.rows;
}
/** A matching override, for idempotent recording of the same correction. */
export async function findOverride(tx, input) {
    const { rows } = await tx.query(`SELECT id, actor_id, deal_id, override_type, old_value, new_value, reason,
            confirmed_at, created_at
       FROM admin_overrides
      WHERE deal_id = $1 AND override_type = $2 AND old_value = $3 AND new_value = $4
      ORDER BY created_at DESC
      LIMIT 1`, [input.dealId, input.overrideType, input.oldValue, input.newValue]);
    return rows[0] ?? null;
}
export async function insertOverride(tx, input) {
    const { rows } = await tx.query(`INSERT INTO admin_overrides
       (actor_id, deal_id, override_type, old_value, new_value, reason, confirmed_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id, actor_id, deal_id, override_type, old_value, new_value, reason,
               confirmed_at, created_at`, [input.actorId, input.dealId, input.overrideType, input.oldValue, input.newValue, input.reason]);
    const row = rows[0];
    if (!row)
        throw new Error('insertOverride returned no row');
    return row;
}
export async function listNotes(targetType, targetId) {
    const res = await query(`SELECT id, target_type, target_id, note_enc, created_by, created_at
       FROM admin_notes
      WHERE target_type = $1 AND target_id = $2
      ORDER BY created_at DESC
      LIMIT 200`, [targetType, targetId]);
    return res.rows;
}
/** A note with identical content by the same author, for idempotent adds. */
export async function findNote(tx, input) {
    const { rows } = await tx.query(`SELECT id, target_type, target_id, note_enc, created_by, created_at
       FROM admin_notes
      WHERE target_type = $1 AND target_id = $2 AND note_enc = $3 AND created_by = $4
      ORDER BY created_at DESC
      LIMIT 1`, [input.targetType, input.targetId, input.noteEnc, input.createdBy]);
    return rows[0] ?? null;
}
export async function insertNote(tx, input) {
    // `note_enc` stores the note as-is for now; envelope encryption is wired in a
    // later task (mirrors the `*_enc` convention used by admin-setting.service).
    const { rows } = await tx.query(`INSERT INTO admin_notes (target_type, target_id, note_enc, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, target_type, target_id, note_enc, created_by, created_at`, [input.targetType, input.targetId, input.noteEnc, input.createdBy]);
    const row = rows[0];
    if (!row)
        throw new Error('insertNote returned no row');
    return row;
}
export async function listActivePauses() {
    const res = await query(`SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses
      WHERE ended_at IS NULL
      ORDER BY started_at DESC NULLS LAST`);
    return res.rows;
}
/** Active pause for a scope, for idempotent start. */
export async function findActivePauseByScope(tx, scope) {
    const { rows } = await tx.query(`SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses
      WHERE scope = $1 AND ended_at IS NULL
      ORDER BY started_at DESC NULLS LAST
      LIMIT 1`, [scope]);
    return rows[0] ?? null;
}
export async function insertPause(tx, input) {
    const { rows } = await tx.query(`INSERT INTO incident_pauses (scope, reason, started_by, started_at)
     VALUES ($1, $2, $3, now())
     RETURNING id, scope, reason, started_by, started_at, ended_by, ended_at`, [input.scope, input.reason, input.startedBy]);
    const row = rows[0];
    if (!row)
        throw new Error('insertPause returned no row');
    return row;
}
export async function getPauseById(tx, pauseId) {
    const { rows } = await tx.query(`SELECT id, scope, reason, started_by, started_at, ended_by, ended_at
       FROM incident_pauses WHERE id = $1 LIMIT 1`, [pauseId]);
    return rows[0] ?? null;
}
/** End a pause; updates only when still active. Returns the updated row. */
export async function endPauseById(tx, pauseId, endedBy) {
    const { rows } = await tx.query(`UPDATE incident_pauses SET ended_by = $2, ended_at = now()
      WHERE id = $1 AND ended_at IS NULL
      RETURNING id, scope, reason, started_by, started_at, ended_by, ended_at`, [pauseId, endedBy]);
    return rows[0] ?? null;
}
export async function listFeatureFlags() {
    const res = await query(`SELECT id, flag_key, description, is_enabled, scope, updated_by, created_at
       FROM feature_flags
      ORDER BY flag_key ASC`);
    return res.rows;
}
export async function getFeatureFlag(tx, key) {
    const { rows } = await tx.query(`SELECT id, flag_key, description, is_enabled, scope, updated_by, created_at
       FROM feature_flags WHERE flag_key = $1 LIMIT 1`, [key]);
    return rows[0] ?? null;
}
/** Toggle a flag's enabled state, preserving description/scope. */
export async function updateFeatureFlag(tx, input) {
    const { rows } = await tx.query(`UPDATE feature_flags SET is_enabled = $2, updated_by = $3
      WHERE flag_key = $1
      RETURNING id, flag_key, description, is_enabled, scope, updated_by, created_at`, [input.key, input.isEnabled, input.updatedBy]);
    return rows[0] ?? null;
}
export async function listAuditLogs(limit) {
    const res = await query(`SELECT id, actor_id, action, target_type, target_id, reason, requires_confirmation,
            request_id, metadata, prev_hash, entry_hash, created_at
       FROM admin_actions
      ORDER BY created_at DESC
      LIMIT $1`, [limit]);
    return res.rows;
}
export async function insertAnnouncement(tx, input) {
    const { rows } = await tx.query(`INSERT INTO announcements (title, body, audience, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, body, audience, starts_at, ends_at, created_at`, [input.title, input.body, input.audience, input.startsAt ?? null, input.endsAt ?? null]);
    const row = rows[0];
    if (!row)
        throw new Error('insertAnnouncement returned no row');
    return row;
}
export async function searchChats(limit) {
    const res = await query(`SELECT c.id, c.deal_id, c.type, c.status, c.created_at,
            d.buyer_id, d.seller_id, d.middleman_id
       FROM chats c
       JOIN deals d ON d.id = c.deal_id
      ORDER BY c.created_at DESC
      LIMIT $1`, [limit]);
    return res.rows;
}
export async function deleteChat(tx, chatId) {
    const res = await tx.query(`UPDATE chats SET status = 'deleted_by_admin' WHERE id = $1`, [chatId]);
    return (res.rowCount ?? 0) > 0;
}
//# sourceMappingURL=admin-ops.repository.js.map