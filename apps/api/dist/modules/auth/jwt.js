/**
 * JWT access/refresh issuance and verification (task 3.4).
 *
 * Access tokens are short-lived (~15 min) and kept in client memory; refresh
 * tokens are longer-lived, rotated on every use, and stored in an
 * httpOnly/Secure/SameSite cookie. Each token carries a unique `jti` so it can
 * be revoked via the denylist (task 3.5). Roles mirror `users.account_type`.
 * (Requirements 3.1, 3.3, 3.4)
 */
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
function expiryOf(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded?.exp) {
            throw new Error('Signed token is missing an exp claim.');
        }
        return new Date(decoded.exp * 1000);
    }
    catch (err) {
        throw new Error(`Failed to decode JWT: ${err instanceof Error ? err.message : String(err)}`);
    }
}
export function issueAccessToken(params, cfg) {
    const jti = randomUUID();
    const options = {
        algorithm: 'HS256',
        subject: params.userId,
        jwtid: jti,
        issuer: cfg.issuer,
        audience: cfg.audience,
        expiresIn: cfg.accessTtl,
    };
    const token = jwt.sign({ role: params.role, sid: params.sessionId, type: 'access' }, cfg.accessSecret, options);
    return { token, jti, expiresAt: expiryOf(token) };
}
export function issueRefreshToken(params, cfg) {
    const jti = randomUUID();
    const options = {
        algorithm: 'HS256',
        subject: params.userId,
        jwtid: jti,
        issuer: cfg.issuer,
        audience: cfg.audience,
        expiresIn: cfg.refreshTtl,
    };
    const token = jwt.sign({ sid: params.sessionId, type: 'refresh' }, cfg.refreshSecret, options);
    return { token, jti, expiresAt: expiryOf(token) };
}
export function verifyAccessToken(token, cfg) {
    const payload = jwt.verify(token, cfg.accessSecret, {
        algorithms: ['HS256'],
        issuer: cfg.issuer,
        audience: cfg.audience,
    });
    if (payload.type !== 'access') {
        throw new Error('Token is not an access token.');
    }
    return payload;
}
export function verifyRefreshToken(token, cfg) {
    const payload = jwt.verify(token, cfg.refreshSecret, {
        algorithms: ['HS256'],
        issuer: cfg.issuer,
        audience: cfg.audience,
    });
    if (payload.type !== 'refresh') {
        throw new Error('Token is not a refresh token.');
    }
    return payload;
}
//# sourceMappingURL=jwt.js.map