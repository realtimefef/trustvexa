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
export declare function listChatsForUser(userId: string): Promise<ChatWithPartiesRow[]>;
/** A single chat plus its deal's parties, or `null` when the chat does not exist. */
export declare function getChatWithParties(chatId: string): Promise<ChatWithPartiesRow | null>;
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
export declare function listMessagesForChat(chatId: string, order: 'asc' | 'desc', limit?: number, before?: string): Promise<MessageHistoryRow[]>;
/**
 * Messages in a chat whose body matches a case-insensitive substring, newest
 * first. The delete-visibility rule is applied by the service via the pure
 * `message-visibility` helpers, so every matching row is returned here. The
 * match runs over `body_enc`, which is plaintext for now (message-body
 * encryption is deferred and wired centrally later, as with other `*_enc`
 * columns); once bodies are encrypted this substring search moves behind that
 * layer.
 */
export declare function searchMessagesForChat(chatId: string, q: string): Promise<MessageHistoryRow[]>;
/** The caller's current draft for a chat, or `null` when none exists. */
export declare function getDraftForChat(chatId: string, userId: string): Promise<{
    body_enc: string | null;
    updated_at: Date | string;
} | null>;
/** Of the given message ids, the subset that actually belongs to the chat. */
export declare function messageIdsInChat(chatId: string, messageIds: readonly string[]): Promise<string[]>;
//# sourceMappingURL=chat-read.repository.d.ts.map