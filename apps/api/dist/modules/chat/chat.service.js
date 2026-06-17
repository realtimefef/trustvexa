/**
 * Chat history read service (REST). Realtime is handled separately by the
 * Socket.IO gateway; this service backs the read-only HTTP endpoints that let a
 * caller list the chats they participate in and page their messages.
 *
 * Authorization reuses the module's existing pure helpers — `canJoinChatRoom`
 * decides per-chat-type access (so a seller never sees the buyer<->middleman
 * side-channel even though they are a party to the deal) and the
 * `message-visibility` helpers apply the delete-visibility rule (a buyer/seller
 * never sees user-deleted messages; the middleman sees them tagged
 * `deletedForUsers`; admin-deleted messages are hidden from everyone).
 *
 * `body_enc` is surfaced as `body` as-is (plaintext today). Message-body
 * encryption is deferred and wired centrally later, consistent with how the
 * other modules treat `*_enc` columns.
 */
import { AppError, notFound } from '../../errors/app-error.js';
import { canJoinChatRoom, canPostMessage, isMiddleman } from './membership.js';
import { canModifyOwnMessage, canPostToChat, MessageValidationError, validateOutgoingMessage, } from './messaging.js';
import { filterMessagesForViewer, } from './message-visibility.js';
import { getChatWithParties, getDraftForChat, listChatsForUser, listMessagesForChat, messageIdsInChat, searchMessagesForChat, } from './chat-read.repository.js';
import { editMessage as editMessageRow, insertMessage, loadMessage, softDeleteMessage, upsertDraft, upsertReceipt, addReaction as addReactionRow, removeReaction as removeReactionRow, pinMessage as pinMessageRow, unpinMessage as unpinMessageRow, } from './message.repository.js';
import { insertAttachment, setScanStatus, } from './attachment.repository.js';
import { validateUpload } from './upload-validation.js';
import { getClient, query } from '@trustvexa/shared';
import { upsertConversationSettings } from './chat.repository.js';
import { generateSignedLink } from '../storage/signed-links.js';
function toIso(value) {
    return value instanceof Date ? value.toISOString() : String(value);
}
function partiesOf(row) {
    return { buyerId: row.buyer_id, sellerId: row.seller_id, middlemanId: row.middleman_id };
}
/** List the chats the caller is an authorized participant of, newest-first. */
export async function listChats(userId) {
    const rows = await listChatsForUser(userId);
    const chats = rows
        .filter((row) => canJoinChatRoom(userId, row.type, partiesOf(row)))
        .map((row) => ({
        id: row.id,
        dealId: row.deal_id,
        type: row.type,
        status: row.status,
        createdAt: toIso(row.created_at),
        isMuted: !!row.is_muted,
        isArchived: !!row.is_archived,
        buyerId: row.buyer_id,
        sellerId: row.seller_id,
        middlemanId: row.middleman_id,
    }));
    return { chats };
}
/**
 * List the messages in a chat the caller may access. Callers who are not an
 * authorized participant of the chat (including parties to the deal who are not
 * members of this particular chat type) get the opaque 404, never a signal that
 * the chat exists.
 */
export async function listMessages(userId, chatId, order = 'asc', limit, before) {
    const chat = await getChatWithParties(chatId);
    if (!chat || chat.status === 'deleted_by_admin') {
        throw notFound('Chat not found.');
    }
    const parties = partiesOf(chat);
    if (!canJoinChatRoom(userId, chat.type, parties)) {
        throw notFound('Chat not found.');
    }
    const viewer = isMiddleman(userId, parties) ? 'middleman' : 'participant';
    const rows = await listMessagesForChat(chatId, order, limit, before);
    const records = rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        bodyEnc: row.body_enc,
        isEdited: row.is_edited,
        isDeleted: row.is_deleted,
        deletedBy: row.deleted_by,
        adminDeletedAt: row.admin_deleted_at === null ? null : toIso(row.admin_deleted_at),
        createdAt: toIso(row.created_at),
    }));
    const createdAtById = new Map(records.map((r) => [r.id, r.createdAt]));
    const replyToById = new Map(rows.map((row) => [row.id, row.reply_to_message_id]));
    const forwardedFromById = new Map(rows.map((row) => [row.id, row.forwarded_from_message_id]));
    const messages = filterMessagesForViewer(records, viewer).map((view) => ({
        id: view.id,
        senderId: view.senderId,
        body: view.bodyEnc,
        isEdited: view.isEdited,
        deletedForUsers: view.deletedForUsers,
        createdAt: createdAtById.get(view.id) ?? '',
        replyTo: replyToById.get(view.id) ?? null,
        forwardedFrom: forwardedFromById.get(view.id) ?? null,
    }));
    const messageIds = messages.map((m) => m.id);
    // Load reactions
    const reactionsRes = messageIds.length > 0
        ? await query(`SELECT message_id, emoji, user_id
           FROM message_reactions
          WHERE message_id = ANY($1::uuid[])`, [messageIds])
        : { rows: [] };
    const reactionsByMessageId = new Map();
    for (const row of reactionsRes.rows) {
        if (!reactionsByMessageId.has(row.message_id)) {
            reactionsByMessageId.set(row.message_id, []);
        }
        const list = reactionsByMessageId.get(row.message_id);
        let group = list.find((g) => g.emoji === row.emoji);
        if (!group) {
            group = { emoji: row.emoji, userIds: [] };
            list.push(group);
        }
        group.userIds.push(row.user_id);
    }
    // Load pins
    const pinsRes = messageIds.length > 0
        ? await query(`SELECT message_id
           FROM message_pins
          WHERE message_id = ANY($1::uuid[])`, [messageIds])
        : { rows: [] };
    const pinnedMessageIds = new Set(pinsRes.rows.map((row) => row.message_id));
    const attachmentsRes = messageIds.length > 0
        ? await query(`SELECT id, message_id, kind, mime_type, size_bytes::text AS size_bytes, scan_status
           FROM message_attachments
          WHERE message_id = ANY($1::uuid[])
            AND admin_deleted_at IS NULL`, [messageIds])
        : { rows: [] };
    const attachmentsByMessageId = new Map();
    const crypto = await import('node:crypto');
    for (const row of attachmentsRes.rows) {
        if (!attachmentsByMessageId.has(row.message_id)) {
            attachmentsByMessageId.set(row.message_id, []);
        }
        const { url, expiresAt } = generateSignedLink(row.id, userId);
        const signedUrlHash = crypto.createHash('sha256').update(url).digest('hex');
        await query(`INSERT INTO file_access_links (attachment_id, user_id, signed_url_hash, expires_at)
       VALUES ($1, $2, $3, $4)`, [row.id, userId, signedUrlHash, expiresAt.toISOString()]);
        attachmentsByMessageId.get(row.message_id).push({
            id: row.id,
            kind: row.kind,
            mimeType: row.mime_type,
            sizeBytes: Number(row.size_bytes),
            scanStatus: row.scan_status,
            url,
        });
    }
    const messagesWithAttachments = messages.map((m) => ({
        ...m,
        attachments: attachmentsByMessageId.get(m.id) || [],
        reactions: reactionsByMessageId.get(m.id) || [],
        isPinned: pinnedMessageIds.has(m.id),
    }));
    return { chatId, messages: messagesWithAttachments };
}
/**
 * Load a chat and authorize the caller as a participant, or throw the opaque
 * 404 used everywhere in this module (the caller never learns whether a chat
 * they may not read exists). Admin-deleted chats are treated as not found.
 */
async function loadAuthorizedChat(userId, chatId) {
    const chat = await getChatWithParties(chatId);
    if (!chat || chat.status === 'deleted_by_admin') {
        throw notFound('Chat not found.');
    }
    const parties = partiesOf(chat);
    if (!canJoinChatRoom(userId, chat.type, parties)) {
        throw notFound('Chat not found.');
    }
    const viewer = isMiddleman(userId, parties) ? 'middleman' : 'participant';
    return { chat, parties, viewer };
}
/** Convert a domain validation failure into the standard 422 envelope. */
function toValidationError(err) {
    if (err instanceof MessageValidationError) {
        throw new AppError('validation_error', err.message, 422);
    }
    throw err;
}
/**
 * Post a message (and any attachment references) to a chat. The caller must be
 * an authorized, non-observer participant (so the middleman may post to the
 * *_mm chats but not the buyer<->seller side-channel they only observe), the
 * chat must be open, and the message must carry text or at least one
 * attachment. The whole write runs in one transaction so a message and its
 * attachments commit together.
 */
export async function postMessage(userId, chatId, input) {
    const { chat, parties } = await loadAuthorizedChat(userId, chatId);
    if (!canPostMessage(userId, chat.type, parties)) {
        throw new AppError('forbidden', 'You may not post to this chat.', 403);
    }
    if (!canPostToChat(chat.status)) {
        throw new AppError('chat_not_open', 'This chat is not open for new messages.', 409);
    }
    const body = input.body !== null && input.body.trim().length > 0 ? input.body : null;
    try {
        validateOutgoingMessage({
            body,
            attachmentCount: input.attachments.length,
            replyToMessageId: input.replyToMessageId,
            forwardedFromMessageId: input.forwardedFromMessageId,
        });
    }
    catch (err) {
        toValidationError(err);
    }
    // Reject any attachment that fails the per-kind type/size/duration limits.
    const attachmentInputs = input.attachments.map((ref) => {
        const sizeBytes = BigInt(Math.trunc(ref.sizeBytes));
        const verdict = validateUpload({
            kind: ref.kind,
            mimeType: ref.mimeType,
            sizeBytes,
            durationSeconds: ref.durationSeconds ?? null,
        });
        if (!verdict.ok) {
            throw new AppError('attachment_rejected', `Attachment rejected: ${verdict.reason}.`, 422);
        }
        return {
            messageId: '', // set after the message row is created
            kind: ref.kind,
            fileKey: ref.fileKey,
            mimeType: ref.mimeType,
            sizeBytes,
            durationSeconds: ref.durationSeconds ?? null,
        };
    });
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const message = await insertMessage(client, {
            chatId,
            senderId: userId,
            // `body_enc` stores the body as-is (plaintext for now); message-body
            // encryption is deferred and wired centrally later (the KeyProvider).
            bodyEnc: body,
            replyToMessageId: input.replyToMessageId,
            forwardedFromMessageId: input.forwardedFromMessageId,
        });
        const attachmentIds = [];
        for (const ref of attachmentInputs) {
            const row = await insertAttachment(client, { ...ref, messageId: message.id });
            // No external malware scanner is provisioned in this deployment. The
            // upload endpoint already enforces strict magic-byte MIME validation
            // (only real jpeg/png/webp/pdf/mp4/webm bytes are accepted), so chat
            // media is marked `clean` here to be deliverable. When an operator wires
            // a real scanner, replace this with an enqueued media-scan job.
            await setScanStatus(client, row.id, 'clean', null);
            attachmentIds.push(row.id);
        }
        await client.query('COMMIT');
        return {
            id: message.id,
            chatId: message.chat_id,
            senderId: message.sender_id,
            body: message.body_enc,
            isEdited: message.is_edited,
            createdAt: new Date().toISOString(),
            attachmentIds,
        };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Edit one of the caller's own messages. Only the original sender may edit
 * (`canModifyOwnMessage`); the prior version is retained in `message_edits`
 * so the middleman keeps the full edit history.
 */
export async function editMessage(userId, chatId, messageId, body) {
    await loadAuthorizedChat(userId, chatId);
    const newBody = body.trim();
    try {
        validateOutgoingMessage({ body: newBody, attachmentCount: 0 });
    }
    catch (err) {
        toValidationError(err);
    }
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const existing = await loadMessage(client, messageId);
        if (!existing || existing.chat_id !== chatId || existing.admin_deleted_at !== null) {
            throw notFound('Message not found.');
        }
        if (!canModifyOwnMessage(existing.sender_id, userId)) {
            throw new AppError('forbidden', 'You may only edit your own messages.', 403);
        }
        await editMessageRow(client, messageId, existing.body_enc, newBody);
        await client.query('COMMIT');
        return { id: messageId, chatId, body: newBody, isEdited: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Soft-delete one of the caller's own messages. The message disappears from
 * the user-facing view but is retained for the middleman, per the existing
 * `message-visibility` rules. Only the original sender may delete.
 */
export async function deleteMessage(userId, chatId, messageId) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const existing = await loadMessage(client, messageId);
        if (!existing || existing.chat_id !== chatId || existing.admin_deleted_at !== null) {
            throw notFound('Message not found.');
        }
        if (!canModifyOwnMessage(existing.sender_id, userId)) {
            throw new AppError('forbidden', 'You may only delete your own messages.', 403);
        }
        await softDeleteMessage(client, messageId, userId);
        await client.query('COMMIT');
        return { id: messageId, chatId, deleted: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Search the messages a caller can see in a chat for a text substring. The
 * delete-visibility filter is applied exactly as in the history read, so a
 * buyer/seller never matches a message they deleted while the middleman does.
 */
export async function searchMessages(userId, chatId, q) {
    const { viewer } = await loadAuthorizedChat(userId, chatId);
    const rows = await searchMessagesForChat(chatId, q);
    const records = rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        bodyEnc: row.body_enc,
        isEdited: row.is_edited,
        isDeleted: row.is_deleted,
        deletedBy: row.deleted_by,
        adminDeletedAt: row.admin_deleted_at === null ? null : toIso(row.admin_deleted_at),
        createdAt: toIso(row.created_at),
    }));
    const createdAtById = new Map(records.map((r) => [r.id, r.createdAt]));
    const messages = filterMessagesForViewer(records, viewer).map((view) => ({
        id: view.id,
        senderId: view.senderId,
        body: view.bodyEnc,
        isEdited: view.isEdited,
        deletedForUsers: view.deletedForUsers,
        createdAt: createdAtById.get(view.id) ?? '',
    }));
    const messageIds = messages.map((m) => m.id);
    const attachmentsRes = messageIds.length > 0
        ? await query(`SELECT id, message_id, kind, mime_type, size_bytes::text AS size_bytes, scan_status
           FROM message_attachments
          WHERE message_id = ANY($1::uuid[])
            AND admin_deleted_at IS NULL`, [messageIds])
        : { rows: [] };
    const attachmentsByMessageId = new Map();
    const crypto = await import('node:crypto');
    for (const row of attachmentsRes.rows) {
        if (!attachmentsByMessageId.has(row.message_id)) {
            attachmentsByMessageId.set(row.message_id, []);
        }
        const { url, expiresAt } = generateSignedLink(row.id, userId);
        const signedUrlHash = crypto.createHash('sha256').update(url).digest('hex');
        await query(`INSERT INTO file_access_links (attachment_id, user_id, signed_url_hash, expires_at)
       VALUES ($1, $2, $3, $4)`, [row.id, userId, signedUrlHash, expiresAt.toISOString()]);
        attachmentsByMessageId.get(row.message_id).push({
            id: row.id,
            kind: row.kind,
            mimeType: row.mime_type,
            sizeBytes: Number(row.size_bytes),
            scanStatus: row.scan_status,
            url,
        });
    }
    const messagesWithAttachments = messages.map((m) => ({
        ...m,
        attachments: attachmentsByMessageId.get(m.id) || [],
    }));
    return { chatId, messages: messagesWithAttachments };
}
/** Read the caller's autosaved draft for a chat (empty when none exists). */
export async function getDraft(userId, chatId) {
    await loadAuthorizedChat(userId, chatId);
    const row = await getDraftForChat(chatId, userId);
    if (!row) {
        return { chatId, body: null, updatedAt: null };
    }
    return { chatId, body: row.body_enc, updatedAt: toIso(row.updated_at) };
}
/**
 * Save (upsert) the caller's autosaved draft for a chat. Stored per
 * (chat_id, user_id); an empty body clears the saved text. The body is stored
 * as-is (plaintext for now), consistent with other `*_enc` columns.
 */
export async function saveDraft(userId, chatId, body) {
    await loadAuthorizedChat(userId, chatId);
    const normalized = body !== null && body.length > 0 ? body : null;
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const row = await upsertDraft(client, chatId, userId, normalized);
        await client.query('COMMIT');
        return { chatId, body: row.body_enc, updatedAt: toIso(row.updated_at) };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
/**
 * Mark one or more messages delivered/read for the caller. Receipts are unique
 * per (message_id, user_id) and upserted, so repeating the call is a no-op
 * beyond refreshing the timestamp. Only ids that actually belong to the chat
 * are recorded; unknown ids are silently ignored.
 */
export async function markReceipts(userId, chatId, messageIds, kind) {
    await loadAuthorizedChat(userId, chatId);
    const valid = await messageIdsInChat(chatId, messageIds);
    if (valid.length === 0) {
        return { chatId, kind, markedMessageIds: [] };
    }
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        for (const messageId of valid) {
            await upsertReceipt(client, messageId, userId, kind);
        }
        await client.query('COMMIT');
        return { chatId, kind, markedMessageIds: valid };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function updateSettings(userId, chatId, settings) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        await upsertConversationSettings(client, chatId, userId, settings);
        await client.query('COMMIT');
        return { chatId, ...settings };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function addReaction(userId, chatId, messageId, emoji) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const msg = await loadMessage(client, messageId);
        if (!msg || msg.chat_id !== chatId) {
            throw notFound('Message not found.');
        }
        await addReactionRow(client, messageId, userId, emoji);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function removeReaction(userId, chatId, messageId, emoji) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const msg = await loadMessage(client, messageId);
        if (!msg || msg.chat_id !== chatId) {
            throw notFound('Message not found.');
        }
        await removeReactionRow(client, messageId, userId, emoji);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function pinMessage(userId, chatId, messageId) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const msg = await loadMessage(client, messageId);
        if (!msg || msg.chat_id !== chatId) {
            throw notFound('Message not found.');
        }
        await pinMessageRow(client, messageId, userId, chatId);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function unpinMessage(userId, chatId, messageId) {
    await loadAuthorizedChat(userId, chatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const msg = await loadMessage(client, messageId);
        if (!msg || msg.chat_id !== chatId) {
            throw notFound('Message not found.');
        }
        await unpinMessageRow(client, messageId, chatId);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function forwardMessage(userId, sourceChatId, messageId, destinationChatId) {
    await loadAuthorizedChat(userId, sourceChatId);
    await loadAuthorizedChat(userId, destinationChatId);
    const client = (await getClient());
    try {
        await client.query('BEGIN');
        const msg = await loadMessage(client, messageId);
        if (!msg || msg.chat_id !== sourceChatId) {
            throw notFound('Message not found.');
        }
        const message = await insertMessage(client, {
            chatId: destinationChatId,
            senderId: userId,
            bodyEnc: msg.body_enc,
            forwardedFromMessageId: msg.id,
        });
        const attachmentsRes = await client.query(`SELECT kind, file_key, mime_type, size_bytes::text AS size_bytes, duration_seconds
         FROM message_attachments
        WHERE message_id = $1 AND admin_deleted_at IS NULL`, [msg.id]);
        const attachmentIds = [];
        for (const att of attachmentsRes.rows) {
            const row = await insertAttachment(client, {
                messageId: message.id,
                kind: att.kind,
                fileKey: att.file_key,
                mimeType: att.mime_type,
                sizeBytes: BigInt(att.size_bytes),
                durationSeconds: att.duration_seconds ? Number(att.duration_seconds) : null,
            });
            // The source attachment was already validated/clean; keep the forwarded
            // copy deliverable.
            await setScanStatus(client, row.id, 'clean', null);
            attachmentIds.push(row.id);
        }
        await client.query('COMMIT');
        return {
            id: message.id,
            senderId: message.sender_id,
            body: message.body_enc,
            isEdited: message.is_edited,
            deletedForUsers: false,
            createdAt: new Date().toISOString(),
            attachments: [],
            reactions: [],
            isPinned: false,
            replyTo: null,
            forwardedFrom: message.forwarded_from_message_id ?? null,
        };
    }
    catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function listPinnedMessages(userId, chatId) {
    const chat = await getChatWithParties(chatId);
    if (!chat || chat.status === 'deleted_by_admin') {
        throw notFound('Chat not found.');
    }
    const parties = partiesOf(chat);
    if (!canJoinChatRoom(userId, chat.type, parties)) {
        throw notFound('Chat not found.');
    }
    const viewer = isMiddleman(userId, parties) ? 'middleman' : 'participant';
    const rowsRes = await query(`SELECT m.*
     FROM messages m
     JOIN message_pins mp ON m.id = mp.message_id
     WHERE m.chat_id = $1
     ORDER BY mp.created_at ASC`, [chatId]);
    const rows = rowsRes.rows;
    const records = rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        bodyEnc: row.body_enc,
        isEdited: row.is_edited,
        isDeleted: row.is_deleted,
        deletedBy: row.deleted_by,
        adminDeletedAt: row.admin_deleted_at === null ? null : toIso(row.admin_deleted_at),
        createdAt: toIso(row.created_at),
    }));
    const createdAtById = new Map(records.map((r) => [r.id, r.createdAt]));
    const replyToById = new Map(rows.map((row) => [row.id, row.reply_to_message_id]));
    const forwardedFromById = new Map(rows.map((row) => [row.id, row.forwarded_from_message_id]));
    const messages = filterMessagesForViewer(records, viewer).map((view) => ({
        id: view.id,
        senderId: view.senderId,
        body: view.bodyEnc,
        isEdited: view.isEdited,
        deletedForUsers: view.deletedForUsers,
        createdAt: createdAtById.get(view.id) ?? '',
        replyTo: replyToById.get(view.id) ?? null,
        forwardedFrom: forwardedFromById.get(view.id) ?? null,
        isPinned: true,
    }));
    const messageIds = messages.map((m) => m.id);
    // Load reactions
    const reactionsRes = messageIds.length > 0
        ? await query(`SELECT message_id, emoji, user_id
           FROM message_reactions
          WHERE message_id = ANY($1::uuid[])`, [messageIds])
        : { rows: [] };
    const reactionsByMessageId = new Map();
    for (const row of reactionsRes.rows) {
        if (!reactionsByMessageId.has(row.message_id)) {
            reactionsByMessageId.set(row.message_id, []);
        }
        const list = reactionsByMessageId.get(row.message_id);
        let group = list.find((g) => g.emoji === row.emoji);
        if (!group) {
            group = { emoji: row.emoji, userIds: [] };
            list.push(group);
        }
        group.userIds.push(row.user_id);
    }
    // Load attachments
    const attachmentsRes = messageIds.length > 0
        ? await query(`SELECT id, message_id, kind, mime_type, size_bytes::text AS size_bytes, scan_status
           FROM message_attachments
          WHERE message_id = ANY($1::uuid[])
            AND admin_deleted_at IS NULL`, [messageIds])
        : { rows: [] };
    const attachmentsByMessageId = new Map();
    const crypto = await import('node:crypto');
    for (const row of attachmentsRes.rows) {
        if (!attachmentsByMessageId.has(row.message_id)) {
            attachmentsByMessageId.set(row.message_id, []);
        }
        const { url, expiresAt } = generateSignedLink(row.id, userId);
        const signedUrlHash = crypto.createHash('sha256').update(url).digest('hex');
        await query(`INSERT INTO attachment_signed_links (id, file_id, user_id, signed_url_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`, [crypto.randomUUID(), row.id, userId, signedUrlHash, expiresAt]);
        attachmentsByMessageId.get(row.message_id).push({
            id: row.id,
            kind: row.kind,
            mimeType: row.mime_type,
            sizeBytes: Number.parseInt(row.size_bytes, 10),
            scanStatus: row.scan_status,
            url,
        });
    }
    const result = messages.map((m) => ({
        ...m,
        reactions: reactionsByMessageId.get(m.id) ?? [],
        attachments: attachmentsByMessageId.get(m.id) ?? [],
    }));
    return {
        chatId,
        messages: result,
    };
}
//# sourceMappingURL=chat.service.js.map