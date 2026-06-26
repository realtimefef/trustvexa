export interface ConnectionRow {
    id: string;
    code: string;
    creator_id: string;
    joiner_id: string | null;
    middleman_id: string | null;
    deal_id: string | null;
    status: 'open' | 'closed';
    created_at: Date | string;
    updated_at: Date | string;
    /** Creator's self-declared role for the pre-deal phase ('buyer' | 'seller'). */
    creator_role?: string;
    /** Authoritative buyer/seller once a deal is linked (from the deals row). */
    deal_buyer_id?: string | null;
    deal_seller_id?: string | null;
    /** Joined usernames for display. */
    creator_username?: string | null;
    joiner_username?: string | null;
    middleman_username?: string | null;
    /** Joined account statuses — used to archive chats whose buyer/seller was deleted. */
    creator_status?: string | null;
    joiner_status?: string | null;
    /** Joined account types — a chat with a middleman participant is a support
     * chat (no buyer↔seller deal can be created from it). */
    creator_account_type?: string | null;
    joiner_account_type?: string | null;
}
export interface ConnectionMessageRow {
    id: string;
    connection_id: string;
    sender_id: string;
    body: string;
    channel: string;
    deleted_at: Date | string | null;
    created_at: Date | string;
}
/** Insert a new connection. Throws on code collision (caller retries). */
export declare function insertConnection(creatorId: string, code: string, creatorRole?: 'buyer' | 'seller'): Promise<ConnectionRow>;
export declare function findConnectionByCode(code: string): Promise<ConnectionRow | null>;
export declare function getConnectionById(id: string): Promise<ConnectionRow | null>;
/** Atomically claim the joiner slot. Returns the row only if the claim won. */
export declare function claimJoiner(connectionId: string, joinerId: string): Promise<ConnectionRow | null>;
/** Atomically set the middleman on an existing connection. Returns null when already set. */
export declare function claimMiddleman(connectionId: string, middlemanId: string): Promise<ConnectionRow | null>;
export declare function listConnectionsForUser(userId: string): Promise<ConnectionRow[]>;
/**
 * Every connection on the platform, most-recently-active first — for the
 * operator (middleman-account) console only. Includes chats with no middleman
 * assigned and pure (non-deal) chats. Callers MUST verify the requester is an
 * operator before using this; it intentionally bypasses participant scoping.
 */
export declare function listAllConnections(limit?: number): Promise<ConnectionRow[]>;
export declare function setConnectionDeal(connectionId: string, dealId: string): Promise<void>;
/**
 * Ensure a /connect conversation exists for a deal, so buyer + seller (and the
 * middleman, if assigned) can chat about it immediately. Idempotent: does
 * nothing when a connection is already linked to the deal. Derives the
 * participants from the deals row. Best-effort — callers ignore failures.
 */
export declare function ensureConnectionForDeal(dealId: string): Promise<string | null>;
export declare function insertConnectionMessage(connectionId: string, senderId: string, body: string, channel?: string): Promise<ConnectionMessageRow>;
export declare function softDeleteConnectionMessage(messageId: string, senderId: string): Promise<boolean>;
export declare function listConnectionMessages(connectionId: string, channel?: string, limit?: number): Promise<ConnectionMessageRow[]>;
//# sourceMappingURL=connections.repository.d.ts.map