// Presence / typing / read-delivery privacy (task 6.5).
// The middleman's presence, last-seen, typing, and read/delivery state must
// NEVER reach a buyer or seller. A user's presence is shared with their
// counterpart (buyer<->seller) and with the middleman in the *_mm chats.
// Enforced server-side: the gateway computes recipients through these helpers.
// (Requirements 28.1, 28.2, 28.3, 28.4)
/**
 * Whether a presence-class signal about `subjectRole` may be emitted to
 * `recipientRole`. The single hard invariant (Property 17): if the subject is
 * the middleman, the answer is always false for buyer/seller recipients.
 */
export function canEmitPresenceTo(subjectRole, recipientRole) {
    // The middleman is invisible: no presence signal of theirs ever leaves to a user.
    if (subjectRole === 'middleman') {
        return recipientRole === 'middleman';
    }
    // A buyer/seller's presence may go to the counterpart and to the middleman.
    return true;
}
/** Filter a recipient list down to those allowed to receive the subject's presence. */
export function allowedPresenceRecipients(subjectRole, recipients) {
    return recipients.filter((r) => canEmitPresenceTo(subjectRole, r.role));
}
//# sourceMappingURL=presence-privacy.js.map