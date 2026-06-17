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
import {
  findTicketByRequestId,
  getTicketForUser,
  insertTicket,
  listTicketsForUser,
  type SupportTicketRow,
  type TxClient,
} from './support.repository.js';
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

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

async function toView(row: SupportTicketRow): Promise<SupportTicketView> {
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
    createdAt: toIso(row.created_at) as string,
  };
}

/**
 * Create a support ticket for the caller, or return the existing one when the
 * same idempotency key (stored as `request_id`) has already been used.
 */
export async function createTicket(
  userId: string,
  requestId: string,
  input: CreateTicketInput,
): Promise<SupportTicketView> {
  const bodyEnc = await sealPii(input.body);
  const row = await withTransaction(async (client) => {
    const tx = client as unknown as TxClient;
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

export async function listTickets(userId: string): Promise<SupportTicketView[]> {
  const rows = await listTicketsForUser(userId);
  return Promise.all(rows.map(toView));
}

export async function getTicket(userId: string, id: string): Promise<SupportTicketView> {
  const row = await getTicketForUser(userId, id);
  if (!row) {
    throw notFound('Support ticket not found.');
  }
  return await toView(row);
}

// ── Middleman (admin) service functions ──────────────────────────────────────

import {
  listAllTickets,
  getTicketById,
  updateTicketStatus,
  insertTicketReply,
  listTicketReplies,
  countTicketsByStatus,
  type AdminTicketRow,
  type TicketReplyRow,
} from './support.repository.js';

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

async function toAdminView(row: AdminTicketRow): Promise<AdminTicketView> {
  const base = await toView(row as SupportTicketRow);
  return {
    ...base,
    userId: row.user_id,
    username: row.username ?? null,
    ticketNumber: row.ticket_number != null ? Number(row.ticket_number) : null,
  };
}

async function toReplyView(row: TicketReplyRow): Promise<TicketReplyView> {
  const body = await openPii(row.body_enc);
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorRole: row.author_role,
    body,
    createdAt: toIso(row.created_at) as string,
  };
}

export interface ListAdminTicketsFilters {
  status?: string;
  priority?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function listAdminTickets(
  filters: ListAdminTicketsFilters = {},
): Promise<{ tickets: AdminTicketView[]; stats: Record<string, number> }> {
  const [rows, stats] = await Promise.all([
    listAllTickets(filters),
    countTicketsByStatus(),
  ]);
  const tickets = await Promise.all(rows.map(toAdminView));
  return { tickets, stats };
}

export async function getAdminTicket(id: string): Promise<AdminTicketView & { replies: TicketReplyView[] }> {
  const [row, replyRows] = await Promise.all([
    getTicketById(id),
    listTicketReplies(id),
  ]);
  if (!row) throw notFound('Support ticket not found.');
  const [view, replies] = await Promise.all([
    toAdminView(row),
    Promise.all(replyRows.map(toReplyView)),
  ]);
  return { ...view, replies };
}

export const VALID_TICKET_STATUSES = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'] as const;
export type TicketStatus = typeof VALID_TICKET_STATUSES[number];

export async function updateAdminTicketStatus(id: string, status: TicketStatus): Promise<AdminTicketView> {
  const row = await getTicketById(id);
  if (!row) throw notFound('Support ticket not found.');

  await withTransaction(async (client) => {
    const tx = client as unknown as import('./support.repository.js').TxClient;
    await updateTicketStatus(tx, id, status);
  });

  const updated = await getTicketById(id);
  return toAdminView(updated!);
}

export async function replyToTicket(
  agentId: string,
  ticketId: string,
  body: string,
  newStatus?: TicketStatus,
): Promise<TicketReplyView> {
  const row = await getTicketById(ticketId);
  if (!row) throw notFound('Support ticket not found.');
  if (row.status === 'closed') {
    throw new AppError('ticket_closed', 'Cannot reply to a closed ticket.', 409);
  }

  const bodyEnc = await sealPii(body);
  const replyRow = await withTransaction(async (client) => {
    const tx = client as unknown as import('./support.repository.js').TxClient;
    const reply = await insertTicketReply(tx, {
      ticketId,
      authorId: agentId,
      authorRole: 'middleman',
      bodyEnc: bodyEnc ?? '',
    });
    const statusToSet: TicketStatus = newStatus ?? 'in_progress';
    if (row.status === 'open' || newStatus) {
      await updateTicketStatus(tx, ticketId, statusToSet);
    }
    return reply;
  });

  return toReplyView(replyRow);
}
