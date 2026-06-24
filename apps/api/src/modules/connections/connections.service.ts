/**
 * Connections service: pre-deal buyer<->seller conversations.
 *
 * Flow: one user creates a connection and gets a short code; the other joins by
 * code; both can chat. A deal can later be created from the connection. Every
 * read/write is authorized to the two participants only.
 */
import { randomInt } from 'node:crypto';

import { query } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import {
  claimJoiner,
  claimMiddleman,
  findConnectionByCode,
  getConnectionById,
  insertConnection,
  insertConnectionMessage,
  listConnectionMessages,
  listConnectionsForUser,
  softDeleteConnectionMessage,
  type ConnectionRow,
} from './connections.repository.js';

/** Unambiguous code alphabet (no 0/O/1/I/L). */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return out;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

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

/**
 * Resolve who the buyer and seller are for a connection.
 * - Once a deal is linked, the deal's buyer_id/seller_id are authoritative.
 * - Before any deal exists, the creator's self-declared role decides: a creator
 *   who said "seller" makes the joiner the buyer, and vice versa.
 */
function resolveRoles(row: ConnectionRow): { buyerId: string | null; sellerId: string | null } {
  if (row.deal_id && row.deal_buyer_id && row.deal_seller_id) {
    return { buyerId: row.deal_buyer_id, sellerId: row.deal_seller_id };
  }
  if (row.creator_role === 'seller') {
    return { buyerId: row.joiner_id, sellerId: row.creator_id };
  }
  return { buyerId: row.creator_id, sellerId: row.joiner_id };
}

/** Map a participant id to its display username within the connection. */
function usernameFor(row: ConnectionRow, id: string | null): string | null {
  if (!id) return null;
  if (id === row.creator_id) return row.creator_username ?? null;
  if (id === row.joiner_id) return row.joiner_username ?? null;
  if (id === row.middleman_id) return row.middleman_username ?? null;
  return null;
}

function toView(row: ConnectionRow): ConnectionView {
  const { buyerId, sellerId } = resolveRoles(row);
  return {
    id: row.id,
    code: row.code,
    creatorId: row.creator_id,
    joinerId: row.joiner_id,
    middlemanId: row.middleman_id ?? null,
    creatorUsername: row.creator_username ?? null,
    joinerUsername: row.joiner_username ?? null,
    middlemanUsername: row.middleman_username ?? null,
    creatorRole: row.creator_role === 'seller' ? 'seller' : 'buyer',
    buyerId,
    sellerId,
    buyerUsername: usernameFor(row, buyerId),
    sellerUsername: usernameFor(row, sellerId),
    dealId: row.deal_id,
    status: row.status,
    joined: row.joiner_id !== null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function isParticipant(row: ConnectionRow, userId: string): boolean {
  return row.creator_id === userId || row.joiner_id === userId || row.middleman_id === userId;
}

/** Create a new connection owned by the caller; returns the join code. */
export async function createConnection(
  userId: string,
  creatorRole: 'buyer' | 'seller' = 'buyer',
): Promise<ConnectionView> {
  // Retry a few times on the (extremely unlikely) code collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = await insertConnection(userId, generateCode(), creatorRole);
      const full = await getConnectionById(row.id);
      return toView(full ?? row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('unique')) continue;
      throw err;
    }
  }
  throw new AppError('connection_code_unavailable', 'Could not allocate a connection code.', 500);
}

/** Join an existing connection by code. Idempotent for the same joiner. */
export async function joinConnection(userId: string, codeRaw: string): Promise<ConnectionView> {
  const code = codeRaw.trim().toUpperCase();
  const row = await findConnectionByCode(code);
  if (!row) {
    throw notFound('No connection found for that code.');
  }
  if (row.creator_id === userId) {
    throw new AppError('cannot_join_own', 'You created this connection; share the code instead.', 422);
  }
  if (row.joiner_id === userId) {
    const full = await getConnectionById(row.id);
    return toView(full ?? row);
  }
  if (row.joiner_id !== null) {
    throw new AppError('connection_full', 'This connection already has two participants.', 409);
  }
  const claimed = await claimJoiner(row.id, userId);
  if (!claimed) {
    // Lost the race or self-join guard tripped.
    throw new AppError('connection_full', 'This connection could not be joined.', 409);
  }
  const full = await getConnectionById(claimed.id);
  return toView(full ?? claimed);
}

export async function listConnections(userId: string): Promise<{ connections: ConnectionView[] }> {
  const rows = await listConnectionsForUser(userId);
  return { connections: rows.map(toView) };
}

/** Load a connection the caller participates in (opaque 404 otherwise). */
export async function getConnection(userId: string, id: string): Promise<ConnectionView> {
  const row = await getConnectionById(id);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  return toView(row);
}

export interface ConnectionMessageView {
  id: string;
  senderId: string;
  body: string;
  channel: string;
  deletedAt: string | null;
  createdAt: string;
  mine: boolean;
}

export async function listMessages(
  userId: string,
  id: string,
  channel?: string,
): Promise<{ connectionId: string; messages: ConnectionMessageView[] }> {
  const row = await getConnectionById(id);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  // Channel access control: buyer_seller is visible to all 3 parties,
  // buyer_mm only to buyer + middleman, seller_mm only to seller + middleman.
  // Buyer/seller are resolved (deal-authoritative) — NOT raw creator/joiner.
  if (channel) {
    const { buyerId, sellerId } = resolveRoles(row);
    const isMm = row.middleman_id === userId;
    const isBuyer = buyerId === userId;
    const isSeller = sellerId === userId;
    if (channel === 'buyer_mm' && !isBuyer && !isMm) {
      throw new AppError('forbidden', 'You cannot access this channel.', 403);
    }
    if (channel === 'seller_mm' && !isSeller && !isMm) {
      throw new AppError('forbidden', 'You cannot access this channel.', 403);
    }
  }
  const rows = await listConnectionMessages(id, channel);
  return {
    connectionId: id,
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      body: m.body,
      channel: m.channel,
      deletedAt: m.deleted_at ? toIso(m.deleted_at) : null,
      createdAt: toIso(m.created_at),
      mine: m.sender_id === userId,
    })),
  };
}

export async function postMessage(
  userId: string,
  id: string,
  bodyRaw: string,
  channel: string = 'buyer_seller',
): Promise<ConnectionMessageView> {
  const body = bodyRaw.trim();
  if (body.length === 0) {
    throw new AppError('message_empty', 'Message must not be empty.', 422);
  }
  const row = await getConnectionById(id);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  if (row.joiner_id === null) {
    throw new AppError('connection_not_joined', 'Wait for the other party to join before chatting.', 409);
  }
  if (row.status === 'closed') {
    throw new AppError('connection_closed', 'This connection is closed.', 409);
  }

  // Channel access control — buyer/seller resolved (deal-authoritative).
  const { buyerId, sellerId } = resolveRoles(row);
  const isMm = row.middleman_id === userId;
  const isBuyer = buyerId === userId;
  const isSeller = sellerId === userId;
  if (channel === 'buyer_seller') {
    if (!isBuyer && !isSeller && !isMm) {
      throw new AppError('forbidden', 'You cannot post to this channel.', 403);
    }
    // Middleman cannot initiate in buyer_seller — they reply in mm channels
    if (isMm) {
      throw new AppError('forbidden', 'Middleman cannot post to the buyer↔seller channel. Use buyer_mm or seller_mm.', 403);
    }
  } else if (channel === 'buyer_mm') {
    if (!isBuyer && !isMm) {
      throw new AppError('forbidden', 'Only the buyer or middleman can post here.', 403);
    }
    if (!row.middleman_id) {
      throw new AppError('no_middleman', 'No middleman is assigned to this connection.', 409);
    }
  } else if (channel === 'seller_mm') {
    if (!isSeller && !isMm) {
      throw new AppError('forbidden', 'Only the seller or middleman can post here.', 403);
    }
    if (!row.middleman_id) {
      throw new AppError('no_middleman', 'No middleman is assigned to this connection.', 409);
    }
  }

  const msg = await insertConnectionMessage(id, userId, body, channel);

  // Publish realtime — only to the participants of this channel
  try {
    const { getRedis } = await import('@trustvexa/shared');
    const redis = getRedis();
    const payload = JSON.stringify({
      connectionId: id,
      senderId: userId,
      body: msg.body,
      channel,
      createdAt: msg.created_at instanceof Date ? msg.created_at.toISOString() : String(msg.created_at),
    });
    let recipients: string[];
    if (channel === 'buyer_mm') {
      recipients = [buyerId, row.middleman_id].filter(Boolean) as string[];
    } else if (channel === 'seller_mm') {
      recipients = [sellerId, row.middleman_id].filter(Boolean) as string[];
    } else {
      // buyer_seller — notify buyer + seller (middleman observes but doesn't get live push for this channel)
      recipients = [buyerId, sellerId].filter(Boolean) as string[];
    }
    for (const uid of recipients) {
      await redis.publish(`realtime:connection:${uid}`, payload);
    }
  } catch {
    // Non-fatal
  }

  return { id: msg.id, senderId: userId, body: msg.body, channel, deletedAt: null, createdAt: toIso(msg.created_at), mine: true };
}

/**
 * Soft-delete a single connection message. Only the original sender may delete
 * their own messages. Idempotent.
 */
export async function deleteMessage(
  userId: string,
  connectionId: string,
  messageId: string,
): Promise<void> {
  const row = await getConnectionById(connectionId);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  await softDeleteConnectionMessage(messageId, userId);
}

/**
 * Close (archive) a connection. Sets status = 'closed'. Only a participant
 * can close it. Idempotent.
 */
export async function closeConnection(userId: string, id: string): Promise<void> {
  const row = await getConnectionById(id);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  if (row.status === 'closed') return; // already closed
  await query(
    `UPDATE connections SET status = 'closed', updated_at = now() WHERE id = $1`,
    [id],
  );
}

/**
 * Open a support/contact connection to the platform middleman. Creates the
 * connection and immediately claims the middleman-side slot, so the chat is
 * open without any code exchange. Any available active middleman is assigned.
 * The caller must not already be a middleman.
 */
export async function contactMiddleman(userId: string): Promise<ConnectionView> {
  const mmRes = await query<{ id: string }>(
    `SELECT id FROM users
      WHERE account_type = 'middleman' AND account_status = 'active'
        AND id <> $1
      ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  const middlemanId = mmRes.rows[0]?.id;
  if (!middlemanId) {
    throw new AppError(
      'no_middleman_available',
      'No middleman is available right now. Please try again shortly.',
      503,
    );
  }
  // Create connection
  let row = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      row = await insertConnection(userId, generateCode());
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('unique')) continue;
      throw err;
    }
  }
  if (!row) {
    throw new AppError('connection_code_unavailable', 'Could not allocate a connection code.', 500);
  }
  // Claim the middleman slot atomically
  const claimed = await claimJoiner(row.id, middlemanId);
  if (!claimed) {
    throw new AppError('no_middleman_available', 'Could not connect to a middleman.', 503);
  }
  const full = await getConnectionById(row.id);
  return toView(full ?? claimed);
}

/**
 * Invite a middleman into an existing buyer↔seller connection. The caller
 * must already be a participant (creator or joiner). An available active
 * middleman is auto-assigned; they join as an observer and can post to the
 * same thread so both sides can talk to them in-context.
 */
export async function inviteMiddlemanToConnection(
  userId: string,
  connectionId: string,
): Promise<ConnectionView> {
  const row = await getConnectionById(connectionId);
  if (!row || !isParticipant(row, userId)) {
    throw notFound('Connection not found.');
  }
  if (row.status === 'closed') {
    throw new AppError('connection_closed', 'This connection is already closed.', 409);
  }
  if (!row.joiner_id) {
    throw new AppError(
      'connection_not_joined',
      'The other party has not joined yet. Both sides need to be present before inviting a middleman.',
      409,
    );
  }
  if (row.middleman_id) {
    // Middleman already present — return the current state idempotently.
    return toView(row);
  }

  const mmRes = await query<{ id: string }>(
    `SELECT id FROM users
      WHERE account_type = 'middleman' AND account_status = 'active'
        AND id <> $1
      ORDER BY created_at ASC LIMIT 1`,
    [userId],
  );
  const middlemanId = mmRes.rows[0]?.id;
  if (!middlemanId) {
    throw new AppError(
      'no_middleman_available',
      'No middleman is available right now. Please try again shortly.',
      503,
    );
  }

  const updated = await claimMiddleman(connectionId, middlemanId);
  if (!updated) {
    // Race: someone else just invited a middleman — re-fetch and return current state.
    const current = await getConnectionById(connectionId);
    if (!current) throw notFound('Connection not found.');
    return toView(current);
  }

  // Keep the linked deal in sync: assigning a middleman in the chat should also
  // make them the deal's middleman so the deal page reflects it (and vice
  // versa — see requestMiddleman which syncs the connection).
  if (row.deal_id) {
    await query(
      `UPDATE deals SET middleman_id = $2, updated_at = now() WHERE id = $1 AND middleman_id IS NULL`,
      [row.deal_id, middlemanId],
    );
  }

  // Notify all three participants via realtime.
  try {
    const { getRedis } = await import('@trustvexa/shared');
    const redis = getRedis();
    const systemMsg = JSON.stringify({
      connectionId,
      senderId: 'system',
      body: '🤝 A middleman has joined this conversation.',
      createdAt: new Date().toISOString(),
    });
    const recipients = [row.creator_id, row.joiner_id, middlemanId].filter(Boolean) as string[];
    for (const uid of recipients) {
      await redis.publish(`realtime:connection:${uid}`, systemMsg);
    }
  } catch {
    // Non-fatal
  }

  const full = await getConnectionById(connectionId);
  return toView(full ?? updated);
}
