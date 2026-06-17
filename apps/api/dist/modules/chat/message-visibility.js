// Delete/edit visibility rules (task 6.3).
// A message deleted by a buyer or seller disappears from the user-facing view
// but stays fully visible to the middleman, who also keeps the edit history. A
// message removed by an admin (admin_deleted_at) is hidden from everyone.
// (Requirement 27.4)
/** Admin-removed content is gone for everyone. */
export function isAdminDeleted(msg) {
    return msg.adminDeletedAt !== null;
}
/**
 * Whether a message is visible to a given viewer.
 * - Admin-deleted: hidden from everyone.
 * - User-deleted (buyer/seller): hidden from participants, visible to middleman.
 * - Otherwise: visible to everyone.
 */
export function isMessageVisible(msg, viewer) {
    if (isAdminDeleted(msg))
        return false;
    if (msg.isDeleted)
        return viewer === 'middleman';
    return true;
}
/** Project a single visible message for a viewer; null when it must be hidden. */
export function projectMessage(msg, viewer) {
    if (!isMessageVisible(msg, viewer))
        return null;
    return {
        id: msg.id,
        senderId: msg.senderId,
        bodyEnc: msg.bodyEnc,
        isEdited: msg.isEdited,
        deletedForUsers: viewer === 'middleman' && msg.isDeleted,
    };
}
/** Filter and project a list of messages for the viewer. */
export function filterMessagesForViewer(messages, viewer) {
    const out = [];
    for (const msg of messages) {
        const view = projectMessage(msg, viewer);
        if (view)
            out.push(view);
    }
    return out;
}
/** Only the middleman may see the prior-version edit history. */
export function editHistoryFor(edits, viewer) {
    return viewer === 'middleman' ? [...edits] : [];
}
//# sourceMappingURL=message-visibility.js.map