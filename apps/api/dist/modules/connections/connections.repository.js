/**
 * Persistence for connections (pre-deal buyer<->seller conversations) and their
 * direct messages. All queries are parameterized. Access control (participant
 * checks) lives in the service.
 */
import { query } from '@trustvexa/shared';
/** Insert a new connection. Throws on code collision (caller retries). */
export async function insertConnection(creatorId, code, creatorRole = 'buyer') {
    const res = await query(`INSERT INTO connections (code, creator_id, creator_role)
     VALUES ($1, $2, $3)
     RETURNING id, code, creator_id, joiner_id, deal_id, status, creator_role, created_at, updated_at`, [code, creatorId, creatorRole]);
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
            c.creator_role, c.created_at, c.updated_at,
            d.buyer_id AS deal_buyer_id, d.seller_id AS deal_seller_id,
            cu.username AS creator_username, ju.username AS joiner_username,
            mu.username AS middleman_username,
            cu.account_status AS creator_status, ju.account_status AS joiner_status,
            cu.account_type AS creator_account_type, ju.account_type AS joiner_account_type
       FROM connections c
       JOIN users cu ON cu.id = c.creator_id
       LEFT JOIN users ju ON ju.id = c.joiner_id
       LEFT JOIN users mu ON mu.id = c.middleman_id
       LEFT JOIN deals d ON d.id = c.deal_id
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
            c.creator_role, c.created_at, c.updated_at,
            d.buyer_id AS deal_buyer_id, d.seller_id AS deal_seller_id,
            cu.username AS creator_username, ju.username AS joiner_username,
            mu.username AS middleman_username,
            cu.account_status AS creator_status, ju.account_status AS joiner_status,
            cu.account_type AS creator_account_type, ju.account_type AS joiner_account_type
       FROM connections c
       JOIN users cu ON cu.id = c.creator_id
       LEFT JOIN users ju ON ju.id = c.joiner_id
       LEFT JOIN users mu ON mu.id = c.middleman_id
       LEFT JOIN deals d ON d.id = c.deal_id
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
/** Unambiguous join-code alphabet (matches the service generator). */
const CONN_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function genConnCode() {
    let out = '';
    for (let i = 0; i < 8; i += 1) {
        out += CONN_CODE_ALPHABET[Math.floor(Math.random() * CONN_CODE_ALPHABET.length)];
    }
    return out;
}
/**
 * Ensure a /connect conversation exists for a deal, so buyer + seller (and the
 * middleman, if assigned) can chat about it immediately. Idempotent: does
 * nothing when a connection is already linked to the deal. Derives the
 * participants from the deals row. Best-effort — callers ignore failures.
 */
export async function ensureConnectionForDeal(dealId) {
    const existing = await query(`SELECT id FROM connections WHERE deal_id = $1 ORDER BY created_at ASC LIMIT 1`, [dealId]);
    if (existing.rows[0])
        return existing.rows[0].id;
    const dealRes = await query(`SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1 LIMIT 1`, [dealId]);
    const d = dealRes.rows[0];
    if (!d || !d.buyer_id || !d.seller_id)
        return null; // both parties required
    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            const ins = await query(`INSERT INTO connections (code, creator_id, creator_role, joiner_id, middleman_id, deal_id, status)
         VALUES ($1, $2, 'seller', $3, $4, $5, 'open')
         RETURNING id`, [genConnCode(), d.seller_id, d.buyer_id, d.middleman_id, dealId]);
            return ins.rows[0]?.id ?? null;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('duplicate') || msg.includes('unique'))
                continue; // code clash → retry
            throw err;
        }
    }
    return null;
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