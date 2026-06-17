/**
 * Read-side data access for the chat history REST surface.
 *
 * Realtime delivery is owned by the Socket.IO gateway; this repository serves
 * only the read-only HTTP history endpoints (list chats, list messages). All
 * authorization is derived from the deal's parties using the existing pure
 * membership/visibility helpers in this module — this file performs no
 * authorization itself, it only loads rows scoped to deals the caller is a
 * party to. Money/identity columns are never selected here.
 *
 * `messages.body_enc` is returned as-is (plaintext for now). Message-body
 * encryption is deferred and wired centrally later (the KeyProvider), exactly
 * as the other modules treat `*_enc` columns today.
 */
import { query } from '@trustvexa/shared';

import type { ChatStatus, ChatType } from './chat-types.js';

/** A chat row joined with its deal's parties, used to authorize history reads. */
export interface ChatWithPartiesRow {
  id: string;
  deal_id: string;
  type: ChatType;
  status: ChatStatus;
  created_at: Date | string;
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
  is_muted?: boolean;
  is_archived?: boolean;
}

/**
 * All chats belonging to deals the user is a party to (buyer/seller/middleman),
 * newest-first. The per-chat-type membership filter (e.g. a seller never sees
 * the buyer<->middleman side-channel) is applied by the service using the pure
 * `membership` helpers, so this read intentionally returns the deal parties.
 * Admin-deleted chats are excluded.
 */
export async function listChatsForUser(userId: string): Promise<ChatWithPartiesRow[]> {
  const res = await query<ChatWithPartiesRow>(
    `SELECT c.id, c.deal_id, c.type, c.status, c.created_at,
            d.buyer_id, d.seller_id, d.middleman_id,
            COALESCE(cs.is_muted, false) AS is_muted,
            COALESCE(cs.is_archived, false) AS is_archived
       FROM chats c
       JOIN deals d ON d.id = c.deal_id
       LEFT JOIN conversation_settings cs ON cs.chat_id = c.id AND cs.user_id = $1
      WHERE c.status <> 'deleted_by_admin'
        AND (d.buyer_id = $1 OR d.seller_id = $1 OR d.middleman_id = $1)
      ORDER BY c.created_at DESC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}

/** A single chat plus its deal's parties, or `null` when the chat does not exist. */
export async function getChatWithParties(chatId: string): Promise<ChatWithPartiesRow | null> {
  const res = await query<ChatWithPartiesRow>(
    `SELECT c.id, c.deal_id, c.type, c.status, c.created_at,
            d.buyer_id, d.seller_id, d.middleman_id
       FROM chats c
       JOIN deals d ON d.id = c.deal_id
      WHERE c.id = $1`,
    [chatId],
  );
  return res.rows[0] ?? null;
}

/** A message row projected for the read-only history view + visibility filter. */
export interface MessageHistoryRow {
  id: string;
  sender_id: string | null;
  body_enc: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  deleted_by: string | null;
  admin_deleted_at: Date | string | null;
  created_at: Date | string;
  reply_to_message_id?: string | null;
  forwarded_from_message_id?: string | null;
}

/**
 * All messages in a chat, chronological by default. The delete-visibility rule
 * (user-deleted messages hidden from buyers/sellers, retained for the
 * middleman; admin-deleted hidden from everyone) is applied by the service via
 * the pure `message-visibility` helpers, so every row is returned here.
 */
export async function listMessagesForChat(
  chatId: string,
  order: 'asc' | 'desc',
  limit?: number,
  before?: string,
): Promise<MessageHistoryRow[]> {
  const queryLimit = limit ?? 50;
  let sql = `SELECT id, sender_id, body_enc, is_edited, is_deleted, deleted_by,
                    admin_deleted_at, created_at, reply_to_message_id, forwarded_from_message_id
               FROM messages
              WHERE chat_id = $1`;
  const params: (string | number)[] = [chatId];

  if (before) {
    sql += ` AND created_at < $2`;
    params.push(before);
  }

  const paramIndexLimit = params.length + 1;
  sql += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIndexLimit}`;
  params.push(queryLimit);

  const res = await query<MessageHistoryRow>(sql, params);

  if (order === 'asc') {
    res.rows.reverse();
  }

  return res.rows;
}

/**
 * Messages in a chat whose body matches a case-insensitive substring, newest
 * first. The delete-visibility rule is applied by the service via the pure
 * `message-visibility` helpers, so every matching row is returned here. The
 * match runs over `body_enc`, which is plaintext for now (message-body
 * encryption is deferred and wired centrally later, as with other `*_enc`
 * columns); once bodies are encrypted this substring search moves behind that
 * layer.
 */
export async function searchMessagesForChat(
  chatId: string,
  q: string,
): Promise<MessageHistoryRow[]> {
  const res = await query<MessageHistoryRow>(
    `SELECT id, sender_id, body_enc, is_edited, is_deleted, deleted_by,
            admin_deleted_at, created_at, reply_to_message_id, forwarded_from_message_id
       FROM messages
      WHERE chat_id = $1
        AND body_enc ILIKE '%' || $2 || '%'
      ORDER BY created_at DESC, id DESC
      LIMIT 100`,
    [chatId, q],
  );
  return res.rows;
}

/** The caller's current draft for a chat, or `null` when none exists. */
export async function getDraftForChat(
  chatId: string,
  userId: string,
): Promise<{ body_enc: string | null; updated_at: Date | string } | null> {
  const res = await query<{ body_enc: string | null; updated_at: Date | string }>(
    `SELECT body_enc, updated_at
       FROM message_drafts
      WHERE chat_id = $1 AND user_id = $2
      LIMIT 1`,
    [chatId, userId],
  );
  return res.rows[0] ?? null;
}

/** Of the given message ids, the subset that actually belongs to the chat. */
export async function messageIdsInChat(
  chatId: string,
  messageIds: readonly string[],
): Promise<string[]> {
  if (messageIds.length === 0) return [];
  const res = await query<{ id: string }>(
    `SELECT id FROM messages WHERE chat_id = $1 AND id = ANY($2::uuid[])`,
    [chatId, [...messageIds]],
  );
  return res.rows.map((r) => r.id);
}
