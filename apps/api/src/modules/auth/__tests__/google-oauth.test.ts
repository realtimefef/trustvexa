/**
 * Task 3.3 — Unit tests for the Google OAuth pure core: signed-state CSRF
 * protection, authorization-URL building, profile parsing, and the
 * account-link decision. The code<->token exchange + userinfo fetch + DB
 * linking are network/DB-bound and covered by the integration suite.
 * (Requirement 2.2)
 */
import { describe, expect, it } from 'vitest';

import {
  buildAuthorizationUrl,
  newOAuthState,
  parseGoogleProfile,
  resolveAccountLink,
  signState,
  verifyState,
  type GoogleOAuthConfig,
} from '../google-oauth.js';

const secret = Buffer.alloc(32, 9);
const cfg: GoogleOAuthConfig = {
  clientId: 'client-123.apps.googleusercontent.com',
  clientSecret: 'secret',
  redirectUri: 'https://trustvexa.example/api/v1/auth/google/callback',
  stateSecret: secret,
};

describe('OAuth state (CSRF)', () => {
  it('round-trips a signed state', () => {
    const state = signState(newOAuthState('/dashboard'), secret);
    const decoded = verifyState(state, secret);
    expect(decoded.returnTo).toBe('/dashboard');
    expect(typeof decoded.nonce).toBe('string');
  });

  it('rejects a tampered state', () => {
    const state = signState(newOAuthState(), secret);
    const tampered = state.slice(0, -2) + (state.endsWith('aa') ? 'bb' : 'aa');
    expect(() => verifyState(tampered, secret)).toThrow();
  });

  it('rejects a state signed with a different secret', () => {
    const state = signState(newOAuthState(), secret);
    expect(() => verifyState(state, Buffer.alloc(32, 1))).toThrow();
  });

  it('rejects an expired state', () => {
    const issued = { nonce: 'n', issuedAt: 1_000 };
    const state = signState(issued, secret);
    expect(() => verifyState(state, secret, 60_000, 1_000 + 120_000)).toThrow(/expired/);
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyState('no-dot', secret)).toThrow();
    expect(() => verifyState('.', secret)).toThrow();
  });
});

describe('authorization URL', () => {
  it('includes client_id, redirect_uri, scope, and state', () => {
    const url = new URL(buildAuthorizationUrl(cfg, 'STATE123'));
    expect(url.searchParams.get('client_id')).toBe(cfg.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(cfg.redirectUri);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toContain('email');
    expect(url.searchParams.get('state')).toBe('STATE123');
  });
});

describe('profile parsing', () => {
  it('normalizes email and verified flag', () => {
    const p = parseGoogleProfile({ sub: '42', email: 'Alice@Example.COM', email_verified: true });
    expect(p.email).toBe('alice@example.com');
    expect(p.emailVerified).toBe(true);
  });

  it('throws when sub or email is missing', () => {
    expect(() => parseGoogleProfile({ email: 'a@b.com' })).toThrow();
    expect(() => parseGoogleProfile({ sub: '1' })).toThrow();
  });
});

describe('account-link decision', () => {
  const verified = { sub: '1', email: 'a@b.com', emailVerified: true };
  it('rejects unverified google email', () => {
    expect(
      resolveAccountLink(
        { ...verified, emailVerified: false },
        { byGoogleSub: null, byEmailHash: null },
      ).action,
    ).toBe('reject');
  });
  it('logs in a linked sub', () => {
    expect(resolveAccountLink(verified, { byGoogleSub: 'u1', byEmailHash: null })).toEqual({
      action: 'login',
      userId: 'u1',
    });
  });
  it('links to an existing email account', () => {
    expect(resolveAccountLink(verified, { byGoogleSub: null, byEmailHash: 'u2' })).toEqual({
      action: 'link',
      userId: 'u2',
    });
  });
  it('creates a new account otherwise', () => {
    expect(resolveAccountLink(verified, { byGoogleSub: null, byEmailHash: null })).toEqual({
      action: 'create',
    });
  });
});
