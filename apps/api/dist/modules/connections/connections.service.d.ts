export interface ConnectionView {
    id: string;
    code: string;
    creatorId: string;
    joinerId: string | null;
    middlemanId: string | null;
    creatorUsername: string | null;
    joinerUsername: string | null;
    middlemanUsername: string | null;
    /** Creator's self-declared role for the pre-deal phase. */
    creatorRole: 'buyer' | 'seller';
    /** Resolved buyer/seller — deal-authoritative when a deal is linked, else
     * derived from creatorRole. The UI must label/route from THESE, never from
     * creator/joiner, so the chat always matches the deal. */
    buyerId: string | null;
    sellerId: string | null;
    buyerUsername: string | null;
    sellerUsername: string | null;
    dealId: string | null;
    status: 'open' | 'closed';
    /** True when both buyer+seller are present. */
    joined: boolean;
    createdAt: string;
    updatedAt: string;
}
/** Create a new connection owned by the caller; returns the join code. */
export declare function createConnection(userId: string, creatorRole?: 'buyer' | 'seller'): Promise<ConnectionView>;
/** Join an existing connection by code. Idempotent for the same joiner. */
export declare function joinConnection(userId: string, codeRaw: string): Promise<ConnectionView>;
export declare function listConnections(userId: string): Promise<{
    connections: ConnectionView[];
}>;
/** Load a connection the caller participates in (opaque 404 otherwise). */
export declare function getConnection(userId: string, id: string): Promise<ConnectionView>;
export interface ConnectionMessageView {
    id: string;
    senderId: string;
    body: string;
    channel: string;
    deletedAt: string | null;
    createdAt: string;
    mine: boolean;
}
export declare function listMessages(userId: string, id: string, channel?: string): Promise<{
    connectionId: string;
    messages: ConnectionMessageView[];
}>;
export declare function postMessage(userId: string, id: string, bodyRaw: string, channel?: string): Promise<ConnectionMessageView>;
/**
 * Soft-delete a single connection message. Only the original sender may delete
 * their own messages. Idempotent.
 */
export declare function deleteMessage(userId: string, connectionId: string, messageId: string): Promise<void>;
/**
 * Close (archive) a connection. Sets status = 'closed'. Only a participant
 * can close it. Idempotent.
 */
export declare function closeConnection(userId: string, id: string): Promise<void>;
/**
 * Open a support/contact connection to the platform middleman. Creates the
 * connection and immediately claims the middleman-side slot, so the chat is
 * open without any code exchange. Any available active middleman is assigned.
 * The caller must not already be a middleman.
 */
export declare function contactMiddleman(userId: string): Promise<ConnectionView>;
/**
 * Invite a middleman into an existing buyer↔seller connection. The caller
 * must already be a participant (creator or joiner). An available active
 * middleman is auto-assigned; they join as an observer and can post to the
 * same thread so both sides can talk to them in-context.
 */
export declare function inviteMiddlemanToConnection(userId: string, connectionId: string): Promise<ConnectionView>;
//# sourceMappingURL=connections.service.d.ts.map