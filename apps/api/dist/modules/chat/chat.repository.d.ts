import type { ChatStatus, ChatType, DealParties } from './chat-types.js';
export interface ChatTxClient {
    query<R>(text: string, params?: unknown[]): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface ChatRow {
    id: string;
    deal_id: string;
    type: ChatType;
    status: ChatStatus;
}
export interface ChatWithParties extends ChatRow {
    parties: DealParties;
}
/** Insert (idempotently) the chat of a given type for a deal. */
export declare function ensureChat(client: ChatTxClient, dealId: string, type: ChatType): Promise<ChatRow>;
/** Load a chat plus the deal's parties, used by the gateway to authorize joins. */
export declare function loadChatWithParties(client: ChatTxClient, chatId: string): Promise<ChatWithParties | null>;
/** Update a chat's status (close on deal-done, reopen, admin delete). */
export declare function setChatStatus(client: ChatTxClient, chatId: string, status: ChatStatus): Promise<void>;
export interface ConversationSettingsInput {
    isMuted?: boolean;
    isArchived?: boolean;
}
export declare function upsertConversationSettings(client: ChatTxClient, chatId: string, userId: string, settings: ConversationSettingsInput): Promise<void>;
//# sourceMappingURL=chat.repository.d.ts.map