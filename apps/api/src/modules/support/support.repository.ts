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

/** Minimal transactional client (pg.PoolClient satisfies this). */
export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
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
export async function findTicketByRequestId(
  tx: TxClient,
  userId: string,
  requestId: string,
): Promise<SupportTicketRow | null> {
  const { rows } = await tx.query<SupportTicketRow>(
    `SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE user_id = $1 AND request_id = $2
      LIMIT 1`,
    [userId, requestId],
  );
  return rows[0] ?? null;
}

export async function insertTicket(
  tx: TxClient,
  input: InsertTicketInput,
): Promise<SupportTicketRow> {
  const { rows } = await tx.query<SupportTicketRow>(
    `INSERT INTO support_tickets
       (user_id, request_id, category, priority, status, subject, body_enc, last_update_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING id, category, priority, status, subject, body_enc,
               expected_response_at, last_update_at, created_at`,
    [
      input.userId,
      input.requestId,
      input.category,
      input.priority,
      input.status,
      input.subject,
      input.bodyEnc,
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('insertTicket returned no row');
  return row;
}

/** List the caller's tickets, newest first. */
export async function listTicketsForUser(userId: string): Promise<SupportTicketRow[]> {
  const res = await query<SupportTicketRow>(
    `SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [userId],
  );
  return res.rows;
}

/** Fetch one of the caller's tickets by id (owner-scoped). */
export async function getTicketForUser(
  userId: string,
  id: string,
): Promise<SupportTicketRow | null> {
  const res = await query<SupportTicketRow>(
    `SELECT id, category, priority, status, subject, body_enc,
            expected_response_at, last_update_at, created_at
       FROM support_tickets
      WHERE id = $1 AND user_id = $2
      LIMIT 1`,
    [id, userId],
  );
  return res.rows[0] ?? null;
}

// ── Middleman (admin) queries ────────────────────────────────────────────────

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
export async function listAllTickets(filters: {
  status?: string;
  priority?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminTicketRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
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

  const res = await query<AdminTicketRow>(
    `SELECT st.id, st.user_id, u.username,
            st.category, st.priority, st.status, st.subject, st.body_enc,
            st.expected_response_at, st.last_update_at, st.created_at,
            ROW_NUMBER() OVER (ORDER BY st.created_at DESC) AS ticket_number
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.user_id
      ${where}
      ORDER BY
        CASE st.priority WHEN 'money_issue' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
        st.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return res.rows;
}

/** Count tickets by status for dashboard stats. */
export async function countTicketsByStatus(): Promise<Record<string, number>> {
  const res = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM support_tickets GROUP BY status`,
  );
  const result: Record<string, number> = {};
  for (const row of res.rows) {
    result[row.status] = Number(row.count);
  }
  return result;
}

/** Get one ticket by id (no user scoping — middleman can see any). */
export async function getTicketById(id: string): Promise<AdminTicketRow | null> {
  const res = await query<AdminTicketRow>(
    `SELECT st.id, st.user_id, u.username,
            st.category, st.priority, st.status, st.subject, st.body_enc,
            st.expected_response_at, st.last_update_at, st.created_at,
            NULL AS ticket_number
       FROM support_tickets st
       LEFT JOIN users u ON u.id = st.user_id
      WHERE st.id = $1
      LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

/** Update ticket status and optionally set resolved timestamp. */
export async function updateTicketStatus(
  tx: TxClient,
  id: string,
  status: string,
): Promise<void> {
  await tx.query(
    `UPDATE support_tickets
        SET status = $2,
            last_update_at = now()
      WHERE id = $1`,
    [id, status],
  );
}

/** Insert a staff reply to a ticket. */
export async function insertTicketReply(
  tx: TxClient,
  input: {
    ticketId: string;
    authorId: string;
    authorRole: string;
    bodyEnc: string;
  },
): Promise<TicketReplyRow> {
  const res = await tx.query<TicketReplyRow>(
    `INSERT INTO support_ticket_replies
       (ticket_id, author_id, author_role, body_enc, created_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id, ticket_id, author_id, author_role, body_enc, created_at`,
    [input.ticketId, input.authorId, input.authorRole, input.bodyEnc],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertTicketReply returned no row');
  return row;
}

/** List replies for a ticket, oldest first. */
export async function listTicketReplies(ticketId: string): Promise<TicketReplyRow[]> {
  const res = await query<TicketReplyRow>(
    `SELECT id, ticket_id, author_id, author_role, body_enc, created_at
       FROM support_ticket_replies
      WHERE ticket_id = $1
      ORDER BY created_at ASC`,
    [ticketId],
  );
  return res.rows;
}
