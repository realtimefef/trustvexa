import type { ChatStatus, ChatType } from './chat-types.js';
import { type AttachmentKind } from './upload-validation.js';
export interface ChatSummary {
    id: string;
    dealId: string;
    type: ChatType;
    status: ChatStatus;
    createdAt: string;
    isMuted: boolean;
    isArchived: boolean;
    buyerId: string | null;
    sellerId: string | null;
    middlemanId: string | null;
}
/** List the chats the caller is an authorized participant of, newest-first. */
export declare function listChats(userId: string): Promise<{
    chats: ChatSummary[];
}>;
export interface ChatAttachment {
    id: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    scanStatus: string;
    url: string;
}
export interface ChatMessage {
    id: string;
    senderId: string | null;
    body: string | null;
    isEdited: boolean;
    /** True only in the middleman view for a message a user soft-deleted. */
    deletedForUsers: boolean;
    createdAt: string;
    attachments?: ChatAttachment[];
    reactions?: Array<{
        emoji: string;
        userIds: string[];
    }>;
    isPinned?: boolean;
    replyTo?: string | null;
    forwardedFrom?: string | null;
}
export interface ChatMessagesResult {
    chatId: string;
    messages: ChatMessage[];
}
/**
 * List the messages in a chat the caller may access. Callers who are not an
 * authorized participant of the chat (including parties to the deal who are not
 * members of this particular chat type) get the opaque 404, never a signal that
 * the chat exists.
 */
export declare function listMessages(userId: string, chatId: string, order?: 'asc' | 'desc', limit?: number, before?: string): Promise<ChatMessagesResult>;
/** An attachment reference accepted on the post-message route. */
export interface AttachmentRefInput {
    kind: AttachmentKind;
    fileKey: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds?: number | null;
}
export interface PostMessageInput {
    body: string | null;
    attachments: AttachmentRefInput[];
    replyToMessageId: string | null;
    forwardedFromMessageId: string | null;
}
export interface PostedMessage {
    id: string;
    chatId: string;
    senderId: string | null;
    body: string | null;
    isEdited: boolean;
    createdAt: string;
    attachmentIds: string[];
}
/**
 * Post a message (and any attachment references) to a chat. The caller must be
 * an authorized, non-observer participant (so the middleman may post to the
 * *_mm chats but not the buyer<->seller side-channel they only observe), the
 * chat must be open, and the message must carry text or at least one
 * attachment. The whole write runs in one transaction so a message and its
 * attachments commit together.
 */
export declare function postMessage(userId: string, chatId: string, input: PostMessageInput): Promise<PostedMessage>;
export interface EditMessageResult {
    id: string;
    chatId: string;
    body: string | null;
    isEdited: boolean;
}
/**
 * Edit one of the caller's own messages. Only the original sender may edit
 * (`canModifyOwnMessage`); the prior version is retained in `message_edits`
 * so the middleman keeps the full edit history.
 */
export declare function editMessage(userId: string, chatId: string, messageId: string, body: string): Promise<EditMessageResult>;
/**
 * Soft-delete one of the caller's own messages. The message disappears from
 * the user-facing view but is retained for the middleman, per the existing
 * `message-visibility` rules. Only the original sender may delete.
 */
export declare function deleteMessage(userId: string, chatId: string, messageId: string): Promise<{
    id: string;
    chatId: string;
    deleted: true;
}>;
/**
 * Search the messages a caller can see in a chat for a text substring. The
 * delete-visibility filter is applied exactly as in the history read, so a
 * buyer/seller never matches a message they deleted while the middleman does.
 */
export declare function searchMessages(userId: string, chatId: string, q: string): Promise<ChatMessagesResult>;
export interface DraftResult {
    chatId: string;
    body: string | null;
    updatedAt: string | null;
}
/** Read the caller's autosaved draft for a chat (empty when none exists). */
export declare function getDraft(userId: string, chatId: string): Promise<DraftResult>;
/**
 * Save (upsert) the caller's autosaved draft for a chat. Stored per
 * (chat_id, user_id); an empty body clears the saved text. The body is stored
 * as-is (plaintext for now), consistent with other `*_enc` columns.
 */
export declare function saveDraft(userId: string, chatId: string, body: string | null): Promise<DraftResult>;
/**
 * Mark one or more messages delivered/read for the caller. Receipts are unique
 * per (message_id, user_id) and upserted, so repeating the call is a no-op
 * beyond refreshing the timestamp. Only ids that actually belong to the chat
 * are recorded; unknown ids are silently ignored.
 */
export declare function markReceipts(userId: string, chatId: string, messageIds: readonly string[], kind: 'delivered' | 'read'): Promise<{
    chatId: string;
    kind: 'delivered' | 'read';
    markedMessageIds: string[];
}>;
export declare function updateSettings(userId: string, chatId: string, settings: {
    isMuted?: boolean;
    isArchived?: boolean;
}): Promise<{
    chatId: string;
    isMuted?: boolean;
    isArchived?: boolean;
}>;
export declare function addReaction(userId: string, chatId: string, messageId: string, emoji: string): Promise<{
    success: boolean;
}>;
export declare function removeReaction(userId: string, chatId: string, messageId: string, emoji: string): Promise<{
    success: boolean;
}>;
export declare function pinMessage(userId: string, chatId: string, messageId: string): Promise<{
    success: boolean;
}>;
export declare function unpinMessage(userId: string, chatId: string, messageId: string): Promise<{
    success: boolean;
}>;
export declare function forwardMessage(userId: string, sourceChatId: string, messageId: string, destinationChatId: string): Promise<ChatMessage>;
export declare function listPinnedMessages(userId: string, chatId: string): Promise<ChatMessagesResult>;
//# sourceMappingURL=chat.service.d.ts.map