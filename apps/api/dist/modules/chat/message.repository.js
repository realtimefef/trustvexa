// Message persistence (task 6.2/6.3). Thin repository over messages and its
// satellite tables (edits, receipts, reactions, mentions). Injected
// transactional client; not barrel-exported; runs only against a real DB.
// (Requirements 27.1, 27.2, 27.3, 27.4, 27.5, 27.6)
export async function insertMessage(client, input) {
    const res = await client.query(`INSERT INTO messages
		   (chat_id, sender_id, body_enc, reply_to_message_id, forwarded_from_message_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, chat_id, sender_id, body_enc, is_edited, is_deleted, deleted_by, admin_deleted_at, reply_to_message_id, forwarded_from_message_id`, [
        input.chatId,
        input.senderId,
        input.bodyEnc,
        input.replyToMessageId ?? null,
        input.forwardedFromMessageId ?? null,
    ]);
    const row = res.rows[0];
    if (!row)
        throw new Error('failed to insert message');
    return row;
}
/**
 * Load a single message for an authorization decision (edit/delete/receipt).
 * Returns the columns needed to verify ownership and current state; `null`
 * when the message does not exist. `body_enc` is the plaintext-for-now body.
 */
export async function loadMessage(client, messageId) {
    const res = await client.query(`SELECT id, chat_id, sender_id, body_enc, is_edited, is_deleted, deleted_by, admin_deleted_at
		 FROM messages
		 WHERE id = $1`, [messageId]);
    return res.rows[0] ?? null;
}
/** Edit a message body, preserving the prior version in message_edits. */
export async function editMessage(client, messageId, oldBodyEnc, newBodyEnc) {
    await client.query(`INSERT INTO message_edits (message_id, old_body_enc) VALUES ($1, $2)`, [
        messageId,
        oldBodyEnc,
    ]);
    await client.query(`UPDATE messages SET body_enc = $2, is_edited = true, edited_at = now() WHERE id = $1`, [messageId, newBodyEnc]);
}
/** Soft-delete by a buyer/seller: hidden from users, retained for the middleman. */
export async function softDeleteMessage(client, messageId, deletedBy) {
    await client.query(`UPDATE messages SET is_deleted = true, deleted_by = $2 WHERE id = $1`, [
        messageId,
        deletedBy,
    ]);
}
/** Upsert a read/delivery receipt (unique per (message_id, user_id)). */
export async function upsertReceipt(client, messageId, userId, kind) {
    const column = kind === 'read' ? 'read_at' : 'delivered_at';
    await client.query(`INSERT INTO message_receipts (message_id, user_id, ${column})
		 VALUES ($1, $2, now())
		 ON CONFLICT (message_id, user_id)
		 DO UPDATE SET ${column} = now()`, [messageId, userId]);
}
/** Toggle a reaction (unique per (message_id, user_id, emoji)). */
export async function addReaction(client, messageId, userId, emoji) {
    await client.query(`INSERT INTO message_reactions (message_id, user_id, emoji)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (message_id, user_id, emoji) DO NOTHING`, [messageId, userId, emoji]);
}
export async function removeReaction(client, messageId, userId, emoji) {
    await client.query(`DELETE FROM message_reactions
     WHERE message_id = $1 AND user_id = $2 AND emoji = $3`, [messageId, userId, emoji]);
}
export async function pinMessage(client, messageId, pinnedBy, chatId) {
    await client.query(`INSERT INTO message_pins (message_id, pinned_by, chat_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id) DO NOTHING`, [messageId, pinnedBy, chatId]);
}
export async function unpinMessage(client, messageId, chatId) {
    await client.query(`DELETE FROM message_pins
     WHERE message_id = $1 AND chat_id = $2`, [messageId, chatId]);
}
export async function messageIsPinned(client, messageId) {
    const res = await client.query(`SELECT 1 FROM message_pins WHERE message_id = $1 LIMIT 1`, [
        messageId,
    ]);
    return (res.rowCount ?? 0) > 0;
}
/** Record @-mentions for a message. */
export async function addMentions(client, messageId, mentionedUserIds) {
    for (const userId of mentionedUserIds) {
        await client.query(`INSERT INTO message_mentions (message_id, mentioned_user_id) VALUES ($1, $2)`, [messageId, userId]);
    }
}
/**
 * Upsert the caller's per-chat draft (unique per (chat_id, user_id)). The body
 * is stored as-is in `body_enc` (plaintext for now; message-body encryption is
 * deferred and wired centrally later, as with other `*_enc` columns).
 */
export async function upsertDraft(client, chatId, userId, bodyEnc) {
    const res = await client.query(`INSERT INTO message_drafts (chat_id, user_id, body_enc, updated_at)
		 VALUES ($1, $2, $3, now())
		 ON CONFLICT (chat_id, user_id)
		 DO UPDATE SET body_enc = EXCLUDED.body_enc, updated_at = now()
		 RETURNING body_enc, updated_at`, [chatId, userId, bodyEnc]);
    const row = res.rows[0];
    if (!row)
        throw new Error('failed to upsert draft');
    return row;
}
//# sourceMappingURL=message.repository.js.map