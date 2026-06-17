// Delete/edit visibility rules (task 6.3).
// A message deleted by a buyer or seller disappears from the user-facing view
// but stays fully visible to the middleman, who also keeps the edit history. A
// message removed by an admin (admin_deleted_at) is hidden from everyone.
// (Requirement 27.4)

export type ViewerKind = 'participant' | 'middleman';

export interface MessageRecord {
  id: string;
  senderId: string | null;
  bodyEnc: string | null;
  isEdited: boolean;
  isDeleted: boolean; // deleted by a buyer/seller participant
  deletedBy: string | null;
  adminDeletedAt: string | null; // global admin removal
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
export function isAdminDeleted(msg: MessageRecord): boolean {
  return msg.adminDeletedAt !== null;
}

/**
 * Whether a message is visible to a given viewer.
 * - Admin-deleted: hidden from everyone.
 * - User-deleted (buyer/seller): hidden from participants, visible to middleman.
 * - Otherwise: visible to everyone.
 */
export function isMessageVisible(msg: MessageRecord, viewer: ViewerKind): boolean {
  if (isAdminDeleted(msg)) return false;
  if (msg.isDeleted) return viewer === 'middleman';
  return true;
}

/** Project a single visible message for a viewer; null when it must be hidden. */
export function projectMessage(msg: MessageRecord, viewer: ViewerKind): MessageView | null {
  if (!isMessageVisible(msg, viewer)) return null;
  return {
    id: msg.id,
    senderId: msg.senderId,
    bodyEnc: msg.bodyEnc,
    isEdited: msg.isEdited,
    deletedForUsers: viewer === 'middleman' && msg.isDeleted,
  };
}

/** Filter and project a list of messages for the viewer. */
export function filterMessagesForViewer(
  messages: readonly MessageRecord[],
  viewer: ViewerKind,
): MessageView[] {
  const out: MessageView[] = [];
  for (const msg of messages) {
    const view = projectMessage(msg, viewer);
    if (view) out.push(view);
  }
  return out;
}

/** Only the middleman may see the prior-version edit history. */
export function editHistoryFor(
  edits: readonly MessageEditRecord[],
  viewer: ViewerKind,
): MessageEditRecord[] {
  return viewer === 'middleman' ? [...edits] : [];
}
