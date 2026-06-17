// Middleman enforcement persistence (task 7.3). Block / limit / downgrade
// writes, each paired with a hash-chained `admin_actions` audit row in the same
// transaction so an enforcement action can never be applied without a tamper-
// evident audit entry. Not barrel-exported. (Requirements 39.x, 21.x, 38.4)
import { createHash } from 'node:crypto';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

const GENESIS = '0'.repeat(64);

export interface UserStateRow {
  id: string;
  account_status: string;
  account_label: string;
  trust_level: number;
}

/** Lock and read the enforcement-relevant columns of the target user. */
export async function lockUser(tx: TxClient, userId: string): Promise<UserStateRow | null> {
  const { rows } = await tx.query<UserStateRow>(
    `SELECT id, account_status, account_label, trust_level
       FROM users WHERE id = $1 FOR UPDATE`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Append one hash-chained `admin_actions` audit row. The chain is global across
 * all admin actions: each entry hashes the previous `entry_hash` plus a
 * canonical payload, so altering or deleting any row breaks every later link.
 */
export async function appendAdminAction(
  tx: TxClient,
  input: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    reason: string;
    requestId: string;
    metadata: Record<string, unknown>;
  },
): Promise<string> {
  const prev = await tx.query<{ entry_hash: string | null }>(
    `SELECT entry_hash FROM admin_actions ORDER BY created_at DESC LIMIT 1`,
  );
  const prevHash = prev.rows[0]?.entry_hash ?? GENESIS;
  const createdAt = new Date().toISOString();
  const canonical = JSON.stringify({
    action: input.action,
    actorId: input.actorId,
    createdAt,
    metadata: input.metadata,
    prevHash,
    reason: input.reason,
    requestId: input.requestId,
    targetId: input.targetId,
    targetType: input.targetType,
  });
  const entryHash = createHash('sha256').update(canonical, 'utf8').digest('hex');
  const { rows } = await tx.query<{ id: string }>(
    `INSERT INTO admin_actions
       (actor_id, action, target_type, target_id, reason, requires_confirmation,
        request_id, metadata, prev_hash, entry_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, true, $6, $7::jsonb, $8, $9, $10)
     RETURNING id`,
    [
      input.actorId,
      input.action,
      input.targetType,
      input.targetId,
      input.reason,
      input.requestId,
      JSON.stringify(input.metadata),
      prevHash,
      entryHash,
      createdAt,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('appendAdminAction returned no row');
  return row.id;
}

/** Set the target user's account status (e.g. `blocked`, `under_review`, `active`). */
export async function setAccountStatus(
  tx: TxClient,
  userId: string,
  status: string,
): Promise<void> {
  await tx.query(`UPDATE users SET account_status = $2, updated_at = now() WHERE id = $1`, [
    userId,
    status,
  ]);
}

/** Set the target user's account label (the trust/limit tier). */
export async function setAccountLabel(tx: TxClient, userId: string, label: string): Promise<void> {
  await tx.query(`UPDATE users SET account_label = $2, updated_at = now() WHERE id = $1`, [
    userId,
    label,
  ]);
}

/** Record a platform block row for the target user. */
export async function insertUserBlock(
  tx: TxClient,
  input: { blockerId: string; blockedUserId: string; reason: string },
): Promise<void> {
  await tx.query(
    `INSERT INTO user_blocks (blocker_id, blocked_user_id, block_type, reason)
     VALUES ($1, $2, 'middleman_platform_block', $3)`,
    [input.blockerId, input.blockedUserId, input.reason],
  );
}

/** Apply a trust-level delta and record the trust_events audit row. */
export async function applyTrustChange(
  tx: TxClient,
  input: { userId: string; change: number; reason: string },
): Promise<number> {
  const { rows } = await tx.query<{ trust_level: number }>(
    `UPDATE users SET trust_level = trust_level + $2, updated_at = now()
       WHERE id = $1 RETURNING trust_level`,
    [input.userId, input.change],
  );
  await tx.query(`INSERT INTO trust_events (user_id, change, reason) VALUES ($1, $2, $3)`, [
    input.userId,
    input.change,
    input.reason,
  ]);
  const row = rows[0];
  if (!row) throw new Error('applyTrustChange returned no row');
  return row.trust_level;
}

/** Record a user-facing warning notice (shown before/with a restriction). */
export async function insertWarningNotice(
  tx: TxClient,
  input: { userId: string; warningType: string; message: string },
): Promise<void> {
  await tx.query(
    `INSERT INTO user_warning_notices (user_id, warning_type, message)
     VALUES ($1, $2, $3)`,
    [input.userId, input.warningType, input.message],
  );
}
