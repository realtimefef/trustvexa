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
export declare function setConnectionDeal(connectionId: string, dealId: string): Promise<void>;
export declare function insertConnectionMessage(connectionId: string, senderId: string, body: string, channel?: string): Promise<ConnectionMessageRow>;
export declare function softDeleteConnectionMessage(messageId: string, senderId: string): Promise<boolean>;
export declare function listConnectionMessages(connectionId: string, channel?: string, limit?: number): Promise<ConnectionMessageRow[]>;
//# sourceMappingURL=connections.repository.d.ts.map