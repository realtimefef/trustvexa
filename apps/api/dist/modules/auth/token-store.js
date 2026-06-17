/**
 * JWT revocation denylist + token-at-rest hashing (task 3.5).
 *
 * The `jti` denylist lives in Redis (fast path, TTL until token expiry) and is
 * mirrored durably in `revoked_tokens` (source of truth, checked on every API
 * and WebSocket auth). Adding a jti on logout / logout-all / password change /
 * block / rotation makes the matching token instantly unusable even before it
 * naturally expires. (Requirements 3.2, 3.5, 3.6)
 */
import { createHash } from 'node:crypto';
import { getRedis, query } from '@trustvexa/shared';
const DENY_PREFIX = 'auth:deny:jti:';
/** Stable hash for storing opaque tokens at rest (auth_tokens.token_hash). */
export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
/** Add a jti to the Redis denylist (TTL until expiry) and the durable mirror. */
export async function revokeJti(params) {
    const ttlSeconds = Math.max(1, Math.ceil((params.expiresAt.getTime() - Date.now()) / 1000));
    try {
        await getRedis().set(`${DENY_PREFIX}${params.jti}`, params.reason, 'EX', ttlSeconds);
    }
    catch {
        // Redis is the fast path only; the durable mirror below is authoritative.
    }
    await query(`INSERT INTO revoked_tokens (jwt_id, user_id, reason, revoked_at, expires_at)
     VALUES ($1, $2, $3, now(), $4)
     ON CONFLICT (jwt_id) DO NOTHING`, [params.jti, params.userId, params.reason, params.expiresAt.toISOString()]);
}
/** True if the jti is revoked. Checks Redis first, then the durable mirror. */
export async function isJtiRevoked(jti) {
    try {
        const hit = await getRedis().get(`${DENY_PREFIX}${jti}`);
        if (hit !== null) {
            return true;
        }
    }
    catch {
        // Redis unavailable: fall through to the authoritative DB check.
    }
    const res = await query(`SELECT jwt_id FROM revoked_tokens WHERE jwt_id = $1 LIMIT 1`, [jti]);
    return res.rows.length > 0;
}
//# sourceMappingURL=token-store.js.map