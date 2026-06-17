/** Minimal transactional client (pg.PoolClient satisfies this). */
export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface SupportTicketRow {
    id: string;
    category: string | null;
    priority: string | null;
    status: string | null;
    subject: string | null;
    body_enc: string | null;
    expected_response_at: Date | string | null;
    last_update_at: Date | string | null;
    created_at: Date | string;
}
export interface InsertTicketInput {
    userId: string;
    requestId: string;
    category: string;
    priority: string;
    status: string;
    subject: string;
    /** Encrypted ticket body stored in `body_enc` (encrypted via sealPii). */
    bodyEnc: string;
}
/** Find one of the caller's tickets by its unique idempotency `request_id`. */
export declare function findTicketByRequestId(tx: TxClient, userId: string, requestId: string): Promise<SupportTicketRow | null>;
export declare function insertTicket(tx: TxClient, input: InsertTicketInput): Promise<SupportTicketRow>;
/** List the caller's tickets, newest first. */
export declare function listTicketsForUser(userId: string): Promise<SupportTicketRow[]>;
/** Fetch one of the caller's tickets by id (owner-scoped). */
export declare function getTicketForUser(userId: string, id: string): Promise<SupportTicketRow | null>;
export interface AdminTicketRow extends SupportTicketRow {
    user_id: string;
    username: string | null;
    ticket_number: number | null;
}
export interface TicketReplyRow {
    id: string;
    ticket_id: string;
    author_id: string;
    author_role: string | null;
    body_enc: string | null;
    created_at: Date | string;
}
/** List ALL support tickets (middleman view), newest first, with optional filters. */
export declare function listAllTickets(filters: {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
    offset?: number;
}): Promise<AdminTicketRow[]>;
/** Count tickets by status for dashboard stats. */
export declare function countTicketsByStatus(): Promise<Record<string, number>>;
/** Get one ticket by id (no user scoping — middleman can see any). */
export declare function getTicketById(id: string): Promise<AdminTicketRow | null>;
/** Update ticket status and optionally set resolved timestamp. */
export declare function updateTicketStatus(tx: TxClient, id: string, status: string): Promise<void>;
/** Insert a staff reply to a ticket. */
export declare function insertTicketReply(tx: TxClient, input: {
    ticketId: string;
    authorId: string;
    authorRole: string;
    bodyEnc: string;
}): Promise<TicketReplyRow>;
/** List replies for a ticket, oldest first. */
export declare function listTicketReplies(ticketId: string): Promise<TicketReplyRow[]>;
//# sourceMappingURL=support.repository.d.ts.map