/**
 * Persistence for connections (pre-deal buyer<->seller conversations) and their
 * direct messages. All queries are parameterized. Access control (participant
 * checks) lives in the service.
 */
import { query } from '@trustvexa/shared';
/** Insert a new connection. Throws on code collision (caller retries). */
export async function insertConnection(creatorId, code) {
    const res = await query(`INSERT INTO connections (code, creator_id)
     VALUES ($1, $2)
     RETURNING id, code, creator_id, joiner_id, deal_id, status, created_at, updated_at`, [code, creatorId]);
    const row = res.rows[0];
    if (!row)
        throw new Error('insertConnection returned no row');
    return row;
}
export async function findConnectionByCode(code) {
    const res = await query(`SELECT id, code, creator_id, joiner_id, middleman_id, deal_id, status, created_at, updated_at
       FROM connections WHERE code = $1 LIMIT 1`, [code]);
    return res.rows[0] ?? null;
}
export async function getConnectionById(id) {
    const res = await query(`SELECT c.id, c.code, c.creator_id, c.joiner_id, c.middleman_id, c.deal_id, c.status,
            c.created_at, c.updated_at,
            cu.username AS creator_username, ju.username AS joiner_username,
            mu.username AS middleman_username
       FROM connections c
       JOIN users cu ON cu.id = c.creator_id
       LEFT JOIN users ju ON ju.id = c.joiner_id
       LEFT JOIN users mu ON mu.id = c.middleman_id
      WHERE c.id = $1 LIMIT 1`, [id]);
    return res.rows[0] ?? null;
}
/** Atomically claim the joiner slot. Returns the row only if the claim won. */
export async function claimJoiner(connectionId, joinerId) {
    const res = await query(`UPDATE connections
        SET joiner_id = $2, updated_at = now()
      WHERE id = $1 AND joiner_id IS NULL AND creator_id <> $2
      RETURNING id, code, creator_id, joiner_id, middleman_id, deal_id, status, created_at, updated_at`, [connectionId, joinerId]);
    return res.rows[0] ?? null;
}
/** Atomically set the middleman on an existing connection. Returns null when already set. */
export async function claimMiddleman(connectionId, middlemanId) {
    const res = await query(`UPDATE connections
        SET middleman_id = $2, updated_at = now()
      WHERE id = $1 AND middleman_id IS NULL AND creator_id <> $2 AND joiner_id <> $2
      RETURNING id, code, creator_id, joiner_id, middleman_id, deal_id, status, created_at, updated_at`, [connectionId, middlemanId]);
    return res.rows[0] ?? null;
}
export async function listConnectionsForUser(userId) {
    const res = await query(`SELECT c.id, c.code, c.creator_id, c.joiner_id, c.middleman_id, c.deal_id, c.status,
            c.created_at, c.updated_at,
            cu.username AS creator_username, ju.username AS joiner_username,
            mu.username AS middleman_username
       FROM connections c
       JOIN users cu ON cu.id = c.creator_id
       LEFT JOIN users ju ON ju.id = c.joiner_id
       LEFT JOIN users mu ON mu.id = c.middleman_id
      WHERE c.creator_id = $1 OR c.joiner_id = $1 OR c.middleman_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 100`, [userId]);
    return res.rows;
}
export async function setConnectionDeal(connectionId, dealId) {
    await query(`UPDATE connections SET deal_id = $2, updated_at = now() WHERE id = $1`, [
        connectionId,
        dealId,
    ]);
}
export async function insertConnectionMessage(connectionId, senderId, body, channel = 'buyer_seller') {
    const res = await query(`INSERT INTO connection_messages (connection_id, sender_id, body, channel)
     VALUES ($1, $2, $3, $4)
     RETURNING id, connection_id, sender_id, body, channel, deleted_at, created_at`, [connectionId, senderId, body, channel]);
    const row = res.rows[0];
    if (!row)
        throw new Error('insertConnectionMessage returned no row');
    return row;
}
export async function softDeleteConnectionMessage(messageId, senderId) {
    const res = await query(`UPDATE connection_messages
        SET deleted_at = now()
      WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL`, [messageId, senderId]);
    return (res.rowCount ?? 0) > 0;
}
export async function listConnectionMessages(connectionId, channel, limit = 200) {
    if (channel) {
        const res = await query(`SELECT id, connection_id, sender_id, body, channel, deleted_at, created_at
         FROM connection_messages
        WHERE connection_id = $1 AND channel = $2
        ORDER BY created_at ASC
        LIMIT $3`, [connectionId, channel, limit]);
        return res.rows;
    }
    const res = await query(`SELECT id, connection_id, sender_id, body, channel, deleted_at, created_at
       FROM connection_messages
      WHERE connection_id = $1
      ORDER BY created_at ASC
      LIMIT $2`, [connectionId, limit]);
    return res.rows;
}
//# sourceMappingURL=connections.repository.js.map