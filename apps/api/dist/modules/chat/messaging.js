// Chat messaging rules: validation and chat open/close lifecycle (task 6.2).
// Pure helpers; persistence lives in the repositories and the event wiring in
// the gateway. "Deal done -> close chat" with reopen is modeled here.
// (Requirements 27.1, 27.2, 27.3, 27.5, 27.6, 27.8, 27.9, 30.6)
export class MessageValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MessageValidationError';
    }
}
export const MAX_MESSAGE_CHARS = 4000;
/** A message must carry a non-empty body or at least one attachment. */
export function validateOutgoingMessage(input) {
    const hasBody = input.body !== null && input.body.trim().length > 0;
    const hasAttachment = input.attachmentCount > 0;
    if (!hasBody && !hasAttachment) {
        throw new MessageValidationError('message must have text or an attachment');
    }
    if (input.body !== null && input.body.length > MAX_MESSAGE_CHARS) {
        throw new MessageValidationError(`message exceeds ${MAX_MESSAGE_CHARS} characters`);
    }
    if (input.replyToMessageId && input.forwardedFromMessageId) {
        throw new MessageValidationError('a message cannot both reply and forward');
    }
}
/** Messages may only be posted to an open chat. */
export function canPostToChat(status) {
    return status === 'open';
}
/** When the deal completes, an open chat is closed (admin-deleted stays as-is). */
export function nextStatusOnDealDone(status) {
    return status === 'open' ? 'closed' : status;
}
/** A closed chat can be reopened; an admin-deleted chat cannot. */
export function canReopenChat(status) {
    return status === 'closed';
}
/** Only the original sender may edit/delete their own message. */
export function canModifyOwnMessage(senderId, actorId) {
    return senderId !== null && senderId === actorId;
}
//# sourceMappingURL=messaging.js.map