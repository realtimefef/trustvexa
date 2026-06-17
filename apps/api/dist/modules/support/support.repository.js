/**
 * Persistence for support tickets (Build Spec §3 "Support / misc").
 *
 * All reads/writes are scoped by `user_id` so a caller only ever sees their own
 * tickets — the user id always comes from the verified JWT, never from request
 * input. Idempotent creation uses the unique `request_id` column: a re-submit
 * with the same key finds the existing row instead of inserting a duplicate.
 * Real columns from the migration are used verbatim. Not barrel-exported.
 *
 * NOTE (encryption-at-rest): `support_tickets.body_enc` is a `*_enc` column.
 * Encryption is fully wired: `support.service.ts` calls `sealPii()` and `openPii()`
 * to encrypt/decrypt ticket bodies using the KEK-backed KeyProvider.
 */
import { query } from '@trustvexa/shared';
/** Find one of the caller's tickets by its unique idempotency `request_id`. */
export async function findTicketByRequestId(tx, userId, requestId) {
    const { rows } = await tx.query(`SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE user_id = $1 AND request_id = $2
      LIMIT 1`, [userId, requestId]);
    return rows[0] ?? null;
}
export async function insertTicket(tx, input) {
    const { rows } = await tx.query(`INSERT INTO support_tickets
       (user_id, request_id, category, priority, status, subject, body_enc, last_update_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING id, category, priority, status, subject, body_enc,
               expected_response_at, last_update_at, created_at`, [
        input.userId,
        input.requestId,
        input.category,
        input.priority,
        input.status,
        input.subject,
        input.bodyEnc,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('insertTicket returned no row');
    return row;
}
/** List the caller's tickets, newest first. */
export async function listTicketsForUser(userId) {
    const res = await query(`SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`, [userId]);
    return res.rows;
}
/** Fetch one of the caller's tickets by id (owner-scoped). */
export async function getTicketForUser(userId, id) {
    const res = await query(`SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE id = $1 AND user_id = $2
      LIMIT 1`, [id, userId]);
    return res.rows[0] ?? null;
}
/** List ALL support tickets (middleman view), newest first, with optional filters. */
export async function listAllTickets(filters) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters.status) {
        conditions.push(`st.status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters.priority) {
        conditions.push(`st.priority = $${idx++}`);
        params.push(filters.priority);
    }
    if (filters.category) {
        conditions.push(`st.category ILIKE $${idx++}`);
        params.push(`%${filters.category}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters.limit ?? 50, 200);
    const offset = filters.offset ?? 0;
    const res = await query(`SELECT st.id, st.user_id, u.username,
            st.category, st.priority, st.status, st.subject, st.body_enc,
            st.expected_response_at, st.last_update_at, st.created_at,
            ROW_NUMBER() OVER (ORDER BY st.created_at DESC) AS ticket_number
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.user_id
      ${where}
      ORDER BY
        CASE st.priority WHEN 'money_issue' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
        st.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`, params);
    return res.rows;
}
/** Count tickets by status for dashboard stats. */
export async function countTicketsByStatus() {
    const res = await query(`SELECT status, COUNT(*)::text AS count FROM support_tickets GROUP BY status`);
    const result = {};
    for (const row of res.rows) {
        result[row.status] = Number(row.count);
    }
    return result;
}
/** Get one ticket by id (no user scoping — middleman can see any). */
export async function getTicketById(id) {
    const res = await query(`SELECT st.id, st.user_id, u.username,
            st.category, st.priority, st.status, st.subject, st.body_enc,
            st.expected_response_at, st.last_update_at, st.created_at,
            NULL AS ticket_number
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.user_id
      WHERE st.id = $1
      LIMIT 1`, [id]);
    return res.rows[0] ?? null;
}
/** Update ticket status and optionally set resolved timestamp. */
export async function updateTicketStatus(tx, id, status) {
    await tx.query(`UPDATE support_tickets
        SET status = $2,
            last_update_at = now()
      WHERE id = $1`, [id, status]);
}
/** Insert a staff reply to a ticket. */
export async function insertTicketReply(tx, input) {
    const res = await tx.query(`INSERT INTO support_ticket_replies
       (ticket_id, author_id, author_role, body_enc, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id, ticket_id, author_id, author_role, body_enc, created_at`, [input.ticketId, input.authorId, input.authorRole, input.bodyEnc]);
    const row = res.rows[0];
    if (!row)
        throw new Error('insertTicketReply returned no row');
    return row;
}
/** List replies for a ticket, oldest first. */
export async function listTicketReplies(ticketId) {
    const res = await query(`SELECT id, ticket_id, author_id, author_role, body_enc, created_at
       FROM support_ticket_replies
      WHERE ticket_id = $1
      ORDER BY created_at ASC`, [ticketId]);
    return res.rows;
}
//# sourceMappingURL=support.repository.js.map