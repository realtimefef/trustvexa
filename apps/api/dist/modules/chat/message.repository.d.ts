export interface MessageTxClient {
    query<R>(text: string, params?: unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface InsertMessageInput {
    chatId: string;
    senderId: string;
    bodyEnc: string | null;
    replyToMessageId?: string | null;
    forwardedFromMessageId?: string | null;
}
export interface MessageRow {
    id: string;
    chat_id: string;
    sender_id: string | null;
    body_enc: string | null;
    is_edited: boolean;
    is_deleted: boolean;
    deleted_by: string | null;
    admin_deleted_at: string | null;
    reply_to_message_id?: string | null;
    forwarded_from_message_id?: string | null;
}
export declare function insertMessage(client: MessageTxClient, input: InsertMessageInput): Promise<MessageRow>;
/**
 * Load a single message for an authorization decision (edit/delete/receipt).
 * Returns the columns needed to verify ownership and current state; `null`
 * when the message does not exist. `body_enc` is the plaintext-for-now body.
 */
export declare function loadMessage(client: MessageTxClient, messageId: string): Promise<MessageRow | null>;
/** Edit a message body, preserving the prior version in message_edits. */
export declare function editMessage(client: MessageTxClient, messageId: string, oldBodyEnc: string | null, newBodyEnc: string): Promise<void>;
/** Soft-delete by a buyer/seller: hidden from users, retained for the middleman. */
export declare function softDeleteMessage(client: MessageTxClient, messageId: string, deletedBy: string): Promise<void>;
/** Upsert a read/delivery receipt (unique per (message_id, user_id)). */
export declare function upsertReceipt(client: MessageTxClient, messageId: string, userId: string, kind: 'delivered' | 'read'): Promise<void>;
/** Toggle a reaction (unique per (message_id, user_id, emoji)). */
export declare function addReaction(client: MessageTxClient, messageId: string, userId: string, emoji: string): Promise<void>;
export declare function removeReaction(client: MessageTxClient, messageId: string, userId: string, emoji: string): Promise<void>;
export declare function pinMessage(client: MessageTxClient, messageId: string, pinnedBy: string, chatId: string): Promise<void>;
export declare function unpinMessage(client: MessageTxClient, messageId: string, chatId: string): Promise<void>;
export declare function messageIsPinned(client: MessageTxClient, messageId: string): Promise<boolean>;
/** Record @-mentions for a message. */
export declare function addMentions(client: MessageTxClient, messageId: string, mentionedUserIds: readonly string[]): Promise<void>;
/**
 * Upsert the caller's per-chat draft (unique per (chat_id, user_id)). The body
 * is stored as-is in `body_enc` (plaintext for now; message-body encryption is
 * deferred and wired centrally later, as with other `*_enc` columns).
 */
export declare function upsertDraft(client: MessageTxClient, chatId: string, userId: string, bodyEnc: string | null): Promise<{
    body_enc: string | null;
    updated_at: string;
}>;
//# sourceMappingURL=message.repository.d.ts.map