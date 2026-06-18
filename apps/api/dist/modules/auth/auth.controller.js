/**
 * Auth HTTP controllers (task 3.2).
 *
 * Thin translation between HTTP and the auth service: the access token is
 * returned in the JSON body (kept in client memory) and the rotating refresh
 * token is set in an httpOnly/Secure/SameSite cookie scoped to the auth path.
 * (Requirements 3.3, 3.4)
 */
import { parse as parseCookie, serialize as serializeCookie } from 'cookie';
import { getAuthConfig } from './auth.config.js';
import * as authService from './auth.service.js';
const REFRESH_COOKIE_PATH = process.env.NODE_ENV === 'production' ? '/api/v1/auth' : '/';
export function requestMeta(req) {
    const fwd = req.headers['x-forwarded-for'];
    const forwarded = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]?.trim();
    const ua = req.headers['user-agent'];
    return {
        ip: forwarded ?? req.ip ?? null,
        userAgent: Array.isArray(ua) ? (ua[0] ?? null) : (ua ?? null),
    };
}
function setRefreshCookie(res, token, expiresAt) {
    const cfg = getAuthConfig();
    res.append('Set-Cookie', serializeCookie(cfg.refreshCookieName, token, {
        httpOnly: true,
        secure: cfg.cookieSecure,
        sameSite: cfg.cookieSecure ? 'none' : 'lax',
        path: REFRESH_COOKIE_PATH,
        expires: expiresAt,
    }));
}
function clearRefreshCookie(res) {
    const cfg = getAuthConfig();
    res.append('Set-Cookie', serializeCookie(cfg.refreshCookieName, '', {
        httpOnly: true,
        secure: cfg.cookieSecure,
        sameSite: cfg.cookieSecure ? 'none' : 'lax',
        path: REFRESH_COOKIE_PATH,
        maxAge: 0,
    }));
}
function readRefreshToken(req) {
    const cfg = getAuthConfig();
    const header = req.headers.cookie;
    if (header) {
        const parsed = parseCookie(header);
        const fromCookie = parsed[cfg.refreshCookieName];
        if (fromCookie) {
            return fromCookie;
        }
    }
    const body = req.body;
    return body?.refreshToken;
}
export function sendAuthResult(res, result, status = 200) {
    setRefreshCookie(res, result.tokens.refreshToken, result.tokens.refreshExpiresAt);
    res.status(status).json({
        user: result.user,
        access_token: result.tokens.accessToken,
        access_expires_at: result.tokens.accessExpiresAt.toISOString(),
    });
}
export async function register(req, res) {
    const result = await authService.register(req.body, requestMeta(req));
    sendAuthResult(res, result, 201);
}
export async function login(req, res) {
    const result = await authService.login(req.body, requestMeta(req));
    if (result && 'totp_required' in result) {
        res.status(200).json(result);
        return;
    }
    sendAuthResult(res, result);
}
export async function refresh(req, res) {
    const token = readRefreshToken(req);
    if (!token) {
        res.status(401).json({
            error_code: 'missing_refresh_token',
            message: 'No refresh token was provided.',
            request_id: req.requestId,
        });
        return;
    }
    const result = await authService.refresh(token, requestMeta(req));
    sendAuthResult(res, result);
}
/**
 * POST /auth/verify-session
 * Non-rotating session check.  Validates the refresh token without consuming
 * it, so the Next.js middleware can confirm auth on every page without racing
 * with client-side token rotation.
 */
export async function verifySession(req, res) {
    const token = readRefreshToken(req);
    if (!token) {
        res.status(401).json({
            error_code: 'missing_refresh_token',
            message: 'No refresh token was provided.',
            request_id: req.requestId,
        });
        return;
    }
    const user = await authService.verifySession(token);
    // Return in AuthResponse shape (no access token issued).
    res.status(200).json({ user, access_token: '', access_expires_at: '' });
}
export async function logout(req, res) {
    const token = readRefreshToken(req);
    await authService.logout(token, req.auth?.jti ?? null, req.auth?.tokenExp ?? null);
    clearRefreshCookie(res);
    res.status(204).end();
}
export async function logoutAll(req, res) {
    if (req.auth?.userId) {
        await authService.logoutAll(req.auth.userId);
    }
    clearRefreshCookie(res);
    res.status(204).end();
}
export function me(req, res) {
    res.status(200).json({
        user_id: req.auth?.userId ?? null,
        role: req.auth?.role ?? null,
        session_id: req.auth?.sessionId ?? null,
    });
}
// --- task 3.3: Google OAuth ---
import { buildAuthorizationUrl, loadGoogleOAuthConfig, newOAuthState, signState, } from './google-oauth.js';
/** GET /auth/google — redirect the browser to Google's consent screen. */
export function googleStart(req, res) {
    const cfg = loadGoogleOAuthConfig();
    const rawReturn = req.query['returnTo'];
    const returnTo = typeof rawReturn === 'string' ? rawReturn : undefined;
    const state = signState(newOAuthState(returnTo), cfg.stateSecret);
    res.redirect(buildAuthorizationUrl(cfg, state));
}
/**
 * GET /auth/google/callback — finish the OAuth exchange, set the refresh
 * cookie, and bounce back to the web app with the access token in the URL
 * fragment (kept in client memory, never sent to the server again).
 */
export async function googleCallback(req, res) {
    const code = req.query['code'];
    const state = req.query['state'];
    const webAppUrl = (process.env['WEB_APP_URL'] ?? '').replace(/\/$/, '');
    if (typeof code !== 'string' || typeof state !== 'string') {
        res.redirect(`${webAppUrl}/login?error=oauth_invalid_request`);
        return;
    }
    try {
        const result = await authService.loginWithGoogle({ code, state }, requestMeta(req));
        setRefreshCookie(res, result.tokens.refreshToken, result.tokens.refreshExpiresAt);
        const fragment = new URLSearchParams({
            access_token: result.tokens.accessToken,
            expires_at: result.tokens.accessExpiresAt.toISOString(),
            new_account: String(result.isNewAccount),
        });
        res.redirect(`${webAppUrl}/auth/callback#${fragment.toString()}`);
    }
    catch {
        // Generic failure; never leak why (CSRF, unverified email, exchange error).
        res.redirect(`${webAppUrl}/login?error=oauth_failed`);
    }
}
//# sourceMappingURL=auth.controller.js.map