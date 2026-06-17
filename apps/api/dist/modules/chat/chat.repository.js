// Chat persistence (task 6.1/6.2). Thin repository over the `chats` table.
// Follows the project repository pattern: a minimal transactional client is
// injected; this file is not barrel-exported and runs only against a real DB.
// (Requirements 27, 30.6)
/** Insert (idempotently) the chat of a given type for a deal. */
export async function ensureChat(client, dealId, type) {
    const res = await client.query(`INSERT INTO chats (deal_id, type)
		 VALUES ($1, $2)
		 ON CONFLICT DO NOTHING
		 RETURNING id, deal_id, type, status`, [dealId, type]);
    if (res.rows[0])
        return res.rows[0];
    const existing = await client.query(`SELECT id, deal_id, type, status FROM chats WHERE deal_id = $1 AND type = $2 LIMIT 1`, [dealId, type]);
    const row = existing.rows[0];
    if (!row)
        throw new Error('failed to create or load chat');
    return row;
}
/** Load a chat plus the deal's parties, used by the gateway to authorize joins. */
export async function loadChatWithParties(client, chatId) {
    const res = await client.query(`SELECT c.id, c.deal_id, c.type, c.status,
		        d.buyer_id, d.seller_id, d.middleman_id
		   FROM chats c
		   JOIN deals d ON d.id = c.deal_id
		  WHERE c.id = $1`, [chatId]);
    const row = res.rows[0];
    if (!row)
        return null;
    return {
        id: row.id,
        deal_id: row.deal_id,
        type: row.type,
        status: row.status,
        parties: {
            buyerId: row.buyer_id,
            sellerId: row.seller_id,
            middlemanId: row.middleman_id,
        },
    };
}
/** Update a chat's status (close on deal-done, reopen, admin delete). */
export async function setChatStatus(client, chatId, status) {
    await client.query(`UPDATE chats SET status = $2 WHERE id = $1`, [chatId, status]);
}
export async function upsertConversationSettings(client, chatId, userId, settings) {
    const isMuted = settings.isMuted !== undefined ? settings.isMuted : null;
    const isArchived = settings.isArchived !== undefined ? settings.isArchived : null;
    await client.query(`INSERT INTO conversation_settings (chat_id, user_id, is_muted, is_archived, archived_at)
     VALUES ($1, $2, COALESCE($3, false), COALESCE($4, false), CASE WHEN $4 = true THEN now() ELSE null END)
     ON CONFLICT (chat_id, user_id) DO UPDATE
     SET is_muted = COALESCE($3, conversation_settings.is_muted),
         is_archived = COALESCE($4, conversation_settings.is_archived),
         archived_at = CASE WHEN EXCLUDED.is_archived = true THEN now() ELSE null END`, [chatId, userId, isMuted, isArchived]);
}
//# sourceMappingURL=chat.repository.js.map