import type { ChatType, DealParties, DealRole } from './chat-types.js';
export interface ChatParticipant {
    userId: string;
    role: DealRole;
    /** Observers (the middleman watching a buyer<->seller chat) may read but not actively chat. */
    observer: boolean;
}
/**
 * Resolve the authorized participants of a chat. The middleman observes the
 * buyer<->seller chat (so they can moderate and see deleted messages) but is a
 * full participant in the *_mm chats and the handover chat.
 */
export declare function chatParticipants(chatType: ChatType, deal: DealParties): ChatParticipant[];
/** The deal role of a user, or null if they are not a party to the deal. */
export declare function roleOf(userId: string, deal: DealParties): DealRole | null;
/** True if the user may join (read) the chat room. */
export declare function canJoinChatRoom(userId: string, chatType: ChatType, deal: DealParties): boolean;
/** True if the user may post messages (observers may not). */
export declare function canPostMessage(userId: string, chatType: ChatType, deal: DealParties): boolean;
/** True if the user is the deal's middleman. */
export declare function isMiddleman(userId: string, deal: DealParties): boolean;
//# sourceMappingURL=membership.d.ts.map