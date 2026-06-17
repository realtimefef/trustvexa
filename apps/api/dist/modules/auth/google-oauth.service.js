/**
 * Google OAuth login — runtime resolver (task 3.3, Requirement 2.2).
 *
 * Validates the signed state (CSRF), exchanges the authorization code for an
 * access token, fetches the verified Google profile, then resolves it to a
 * local user (login / link / create). Session + JWT issuance is delegated to
 * `auth.service.loginWithGoogle`, which reuses the exact same
 * `establishSession` flow as password login. Network calls hit Google
 * directly; no third-party OAuth SDK is required. Runs only with
 * operator-provided GCP credentials present in the environment.
 */
import { hashLookup } from '@trustvexa/shared';
import { getAuthConfig } from './auth.config.js';
import { GOOGLE_TOKEN_ENDPOINT, GOOGLE_USERINFO_ENDPOINT, loadGoogleOAuthConfig, parseGoogleProfile, resolveAccountLink, verifyState, } from './google-oauth.js';
import { createUser, findUserByEmailHash, findUserById, } from './auth.repository.js';
async function exchangeCode(cfg, code) {
    const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            redirect_uri: cfg.redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!res.ok) {
        throw new Error(`Google token exchange failed (${res.status}).`);
    }
    const json = (await res.json());
    if (!json.access_token)
        throw new Error('Google token response missing access_token.');
    return json.access_token;
}
async function fetchProfile(accessToken) {
    const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
        headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        throw new Error(`Google userinfo fetch failed (${res.status}).`);
    }
    return parseGoogleProfile((await res.json()));
}
function usernameFromProfile(profile) {
    const base = profile.email.split('@')[0] ?? 'user';
    const cleaned = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 24) || 'user';
    return `${cleaned}_${Math.random().toString(36).slice(2, 8)}`;
}
/**
 * Validate state + exchange code + resolve the local account for a Google
 * callback. Returns the resolved `UserRecord`; the caller issues the session.
 */
export async function resolveGoogleUser(args) {
    const cfg = loadGoogleOAuthConfig();
    const authCfg = getAuthConfig();
    // 1. CSRF: the state must be one we signed and not expired.
    verifyState(args.state, cfg.stateSecret);
    // 2. Exchange the code and fetch the verified profile from Google.
    const accessToken = await exchangeCode(cfg, args.code);
    const profile = await fetchProfile(accessToken);
    // 3. Resolve what to do with this identity.
    const emailHash = hashLookup(profile.email, authCfg.lookupHashKey);
    const existingByEmail = await findUserByEmailHash(emailHash);
    const decision = resolveAccountLink(profile, {
        // A dedicated oauth_identities table holds sub<->user links at runtime;
        // until that migration lands we resolve by verified email only.
        byGoogleSub: null,
        byEmailHash: existingByEmail?.id ?? null,
    });
    if (decision.action === 'reject') {
        throw new Error(`Google login rejected: ${decision.reason}`);
    }
    if (decision.action === 'login' || decision.action === 'link') {
        const user = await findUserById(decision.userId);
        if (!user)
            throw new Error('Linked account no longer exists.');
        return { user, isNewAccount: false };
    }
    // create: federated account with no local password.
    const created = await createUser({
        username: usernameFromProfile(profile),
        emailHash,
        emailEnc: null,
        signupDetailsEnc: null,
        passwordHash: '',
        accountType: 'user',
        ageConfirmed: true,
    }, []);
    return { user: created, isNewAccount: true };
}
//# sourceMappingURL=google-oauth.service.js.map