/**
 * Support-tickets service (Build Spec §3 "Support / misc").
 *
 * Ownership is enforced from the JWT user id passed by the controller; a user
 * id is never read from request input. Ticket creation is idempotent: the
 * caller's Idempotency-Key is stored in the unique `request_id` column and a
 * re-submit returns the existing ticket instead of creating a duplicate, using
 * a single transaction so the find-or-insert cannot race.
 */
import { withTransaction } from '@trustvexa/shared';
import { sealPii, openPii } from '../crypto/key-provider.js';
import { notFound, AppError } from '../../errors/app-error.js';
import { findTicketByRequestId, getTicketForUser, insertTicket, listTicketsForUser, } from './support.repository.js';
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
async function toView(row) {
    const decrypted = await openPii(row.body_enc);
    return {
        id: row.id,
        category: row.category,
        priority: row.priority,
        status: row.status,
        subject: row.subject,
        body: decrypted,
        expectedResponseAt: toIso(row.expected_response_at),
        lastUpdateAt: toIso(row.last_update_at),
        createdAt: toIso(row.created_at),
    };
}
/**
 * Create a support ticket for the caller, or return the existing one when the
 * same idempotency key (stored as `request_id`) has already been used.
 */
export async function createTicket(userId, requestId, input) {
    const bodyEnc = await sealPii(input.body);
    const row = await withTransaction(async (client) => {
        const tx = client;
        const existing = await findTicketByRequestId(tx, userId, requestId);
        if (existing) {
            return existing;
        }
        return insertTicket(tx, {
            userId,
            requestId,
            category: input.category,
            priority: input.priority,
            status: 'open',
            subject: input.subject,
            bodyEnc: bodyEnc ?? '',
        });
    });
    return await toView(row);
}
export async function listTickets(userId) {
    const rows = await listTicketsForUser(userId);
    return Promise.all(rows.map(toView));
}
export async function getTicket(userId, id) {
    const row = await getTicketForUser(userId, id);
    if (!row) {
        throw notFound('Support ticket not found.');
    }
    return await toView(row);
}
// ── Middleman (admin) service functions ──────────────────────────────────────
import { listAllTickets, getTicketById, updateTicketStatus, insertTicketReply, listTicketReplies, countTicketsByStatus, } from './support.repository.js';
async function toAdminView(row) {
    const base = await toView(row);
    return {
        ...base,
        userId: row.user_id,
        username: row.username ?? null,
        ticketNumber: row.ticket_number != null ? Number(row.ticket_number) : null,
    };
}
async function toReplyView(row) {
    const body = await openPii(row.body_enc);
    return {
        id: row.id,
        ticketId: row.ticket_id,
        authorId: row.author_id,
        authorRole: row.author_role,
        body,
        createdAt: toIso(row.created_at),
    };
}
export async function listAdminTickets(filters = {}) {
    const [rows, stats] = await Promise.all([
        listAllTickets(filters),
        countTicketsByStatus(),
    ]);
    const tickets = await Promise.all(rows.map(toAdminView));
    return { tickets, stats };
}
export async function getAdminTicket(id) {
    const [row, replyRows] = await Promise.all([
        getTicketById(id),
        listTicketReplies(id),
    ]);
    if (!row)
        throw notFound('Support ticket not found.');
    const [view, replies] = await Promise.all([
        toAdminView(row),
        Promise.all(replyRows.map(toReplyView)),
    ]);
    return { ...view, replies };
}
export const VALID_TICKET_STATUSES = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'];
export async function updateAdminTicketStatus(id, status) {
    const row = await getTicketById(id);
    if (!row)
        throw notFound('Support ticket not found.');
    await withTransaction(async (client) => {
        const tx = client;
        await updateTicketStatus(tx, id, status);
    });
    const updated = await getTicketById(id);
    return toAdminView(updated);
}
export async function replyToTicket(agentId, ticketId, body, newStatus) {
    const row = await getTicketById(ticketId);
    if (!row)
        throw notFound('Support ticket not found.');
    if (row.status === 'closed') {
        throw new AppError('ticket_closed', 'Cannot reply to a closed ticket.', 409);
    }
    const bodyEnc = await sealPii(body);
    const replyRow = await withTransaction(async (client) => {
        const tx = client;
        const reply = await insertTicketReply(tx, {
            ticketId,
            authorId: agentId,
            authorRole: 'middleman',
            bodyEnc: bodyEnc ?? '',
        });
        const statusToSet = newStatus ?? 'in_progress';
        if (row.status === 'open' || newStatus) {
            await updateTicketStatus(tx, ticketId, statusToSet);
        }
        return reply;
    });
    return toReplyView(replyRow);
}
//# sourceMappingURL=support.service.js.map