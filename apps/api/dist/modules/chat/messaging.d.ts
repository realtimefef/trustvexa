import type { ChatStatus } from './chat-types.js';
export interface OutgoingMessageInput {
    body: string | null;
    attachmentCount: number;
    replyToMessageId?: string | null;
    forwardedFromMessageId?: string | null;
}
export declare class MessageValidationError extends Error {
    constructor(message: string);
}
export declare const MAX_MESSAGE_CHARS = 4000;
/** A message must carry a non-empty body or at least one attachment. */
export declare function validateOutgoingMessage(input: OutgoingMessageInput): void;
/** Messages may only be posted to an open chat. */
export declare function canPostToChat(status: ChatStatus): boolean;
/** When the deal completes, an open chat is closed (admin-deleted stays as-is). */
export declare function nextStatusOnDealDone(status: ChatStatus): ChatStatus;
/** A closed chat can be reopened; an admin-deleted chat cannot. */
export declare function canReopenChat(status: ChatStatus): boolean;
/** Only the original sender may edit/delete their own message. */
export declare function canModifyOwnMessage(senderId: string | null, actorId: string): boolean;
//# sourceMappingURL=messaging.d.ts.map