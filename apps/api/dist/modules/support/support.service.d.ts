import type { CreateTicketInput } from './support.schemas.js';
export interface SupportTicketView {
    id: string;
    category: string | null;
    priority: string | null;
    status: string | null;
    subject: string | null;
    /** Plaintext body (stored in `body_enc`; see repository encryption note). */
    body: string | null;
    expectedResponseAt: string | null;
    lastUpdateAt: string | null;
    createdAt: string;
}
/**
 * Create a support ticket for the caller, or return the existing one when the
 * same idempotency key (stored as `request_id`) has already been used.
 */
export declare function createTicket(userId: string, requestId: string, input: CreateTicketInput): Promise<SupportTicketView>;
export declare function listTickets(userId: string): Promise<SupportTicketView[]>;
export declare function getTicket(userId: string, id: string): Promise<SupportTicketView>;
export interface AdminTicketView extends SupportTicketView {
    userId: string;
    username: string | null;
    ticketNumber: number | null;
}
export interface TicketReplyView {
    id: string;
    ticketId: string;
    authorId: string;
    authorRole: string | null;
    body: string | null;
    createdAt: string;
}
export interface ListAdminTicketsFilters {
    status?: string;
    priority?: string;
    category?: string;
    limit?: number;
    offset?: number;
}
export declare function listAdminTickets(filters?: ListAdminTicketsFilters): Promise<{
    tickets: AdminTicketView[];
    stats: Record<string, number>;
}>;
export declare function getAdminTicket(id: string): Promise<AdminTicketView & {
    replies: TicketReplyView[];
}>;
export declare const VALID_TICKET_STATUSES: readonly ["open", "in_progress", "waiting_on_user", "resolved", "closed"];
export type TicketStatus = typeof VALID_TICKET_STATUSES[number];
export declare function updateAdminTicketStatus(id: string, status: TicketStatus): Promise<AdminTicketView>;
export declare function replyToTicket(agentId: string, ticketId: string, body: string, newStatus?: TicketStatus): Promise<TicketReplyView>;
//# sourceMappingURL=support.service.d.ts.map