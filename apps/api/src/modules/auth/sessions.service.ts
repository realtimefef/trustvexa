/**
 * Session, device, and security-log queries (task 3.8).
 *
 * Lets a user see every active session/device and revoke any one of them.
 * Revoking a session also denylists its refresh-token jti so the cut is
 * immediate across REST + WebSocket. (Requirements 3.8, 31.x)
 */
import { AppError } from '../../errors/app-error.js';
import * as repo from './auth.repository.js';
import { revokeJti } from './token-store.js';

const FALLBACK_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionView {
  id: string;
  device: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  current: boolean;
}

export async function listSessions(
  userId: string,
  currentSessionId: string | null,
): Promise<SessionView[]> {
  const rows = await repo.listActiveSessions(userId);
  return rows.map((s) => ({
    id: s.id,
    device: s.device,
    ip: s.ip,
    lastSeenAt: s.last_seen_at,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    current: s.id === currentSessionId,
  }));
}

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await repo.findSessionForUser(sessionId, userId);
  if (!session) {
    throw new AppError('not_found', 'Session not found.', 404);
  }
  await repo.revokeSession(sessionId);
  const jtis = await repo.revokeRefreshTokensForSession(sessionId);
  const fallbackExpiry = new Date(Date.now() + FALLBACK_EXPIRY_MS);
  await Promise.all(
    jtis.map((jti) => revokeJti({ jti, userId, reason: 'logout', expiresAt: fallbackExpiry })),
  );
  await repo.recordSecurityEvent({
    userId,
    eventType: 'session_revoked',
    ip: null,
    device: session.device,
  });
}

export interface SecurityEventView {
  id: string;
  eventType: string | null;
  ip: string | null;
  device: string | null;
  createdAt: string;
}

export async function listSecurityEvents(userId: string): Promise<SecurityEventView[]> {
  const rows = await repo.listSecurityEvents(userId, 100);
  return rows.map((e) => ({
    id: e.id,
    eventType: e.event_type,
    ip: e.ip,
    device: e.device,
    createdAt: e.created_at,
  }));
}
