export type ViewerKind = 'participant' | 'middleman';
export interface MessageRecord {
    id: string;
    senderId: string | null;
    bodyEnc: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    deletedBy: string | null;
    adminDeletedAt: string | null;
}
export interface MessageEditRecord {
    messageId: string;
    oldBodyEnc: string | null;
    editedAt: string;
}
export interface MessageView {
    id: string;
    senderId: string | null;
    bodyEnc: string | null;
    isEdited: boolean;
    /** Present (true) only in the middleman view for a user-deleted message. */
    deletedForUsers: boolean;
}
/** Admin-removed content is gone for everyone. */
export declare function isAdminDeleted(msg: MessageRecord): boolean;
/**
 * Whether a message is visible to a given viewer.
 * - Admin-deleted: hidden from everyone.
 * - User-deleted (buyer/seller): hidden from participants, visible to middleman.
 * - Otherwise: visible to everyone.
 */
export declare function isMessageVisible(msg: MessageRecord, viewer: ViewerKind): boolean;
/** Project a single visible message for a viewer; null when it must be hidden. */
export declare function projectMessage(msg: MessageRecord, viewer: ViewerKind): MessageView | null;
/** Filter and project a list of messages for the viewer. */
export declare function filterMessagesForViewer(messages: readonly MessageRecord[], viewer: ViewerKind): MessageView[];
/** Only the middleman may see the prior-version edit history. */
export declare function editHistoryFor(edits: readonly MessageEditRecord[], viewer: ViewerKind): MessageEditRecord[];
//# sourceMappingURL=message-visibility.d.ts.map