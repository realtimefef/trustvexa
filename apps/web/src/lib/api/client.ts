import type { ApiErrorBody } from './types';

/**
 * Browser API client for the TrustVexa REST API.
 *
 * - Base URL comes from `NEXT_PUBLIC_API_BASE_URL` (the API runs as a separate
 *   Render service); it falls back to a same-origin relative path for local
 *   single-origin setups.
 * - The short-lived access token is held in memory only (never localStorage) and
 *   sent as a Bearer header. The rotating refresh token lives in an httpOnly
 *   cookie, so we always send credentials and can silently refresh on a 401.
 * - Errors are surfaced as a typed {@link ApiError} carrying the server's
 *   `error_code` and `request_id` for support correlation.
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const API_PREFIX = '/api/v1';

let accessToken: string | null = null;
// Singleton promise to deduplicate concurrent refresh calls.
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error_code ?? 'request_failed';
    this.requestId = body?.request_id;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Sent as the `Idempotency-Key` header on money/state-changing routes. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Internal: prevents infinite refresh recursion. */
  _isRetry?: boolean;
}

/** Generate an Idempotency-Key for a state-changing request. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) {
    return undefined;
  }
  const text = await res.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_ORIGIN}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      accessToken = null;
      return false;
    }
    const data = (await parseBody(res)) as { access_token?: string } | undefined;
    if (data?.access_token) {
      accessToken = data.access_token;
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Refresh the access token using the httpOnly refresh cookie.
 * Concurrent callers share the same in-flight request to avoid consuming
 * the rotating refresh token multiple times.
 */
async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/** Perform a typed JSON request against the API. */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
  };
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  if (options.signal) {
    init.signal = options.signal;
  }

  const res = await fetch(`${API_ORIGIN}${API_PREFIX}${path}`, init);

  // Silent refresh-and-retry once on an expired/invalid access token.
  // Only attempt if we previously had an access token (i.e. the token expired).
  // Skip during bootstrap (accessToken === null) to avoid racing with the
  // auth-context's own /auth/refresh call, which would cause both to consume
  // the same rotating refresh token.
  if (res.status === 401 && !options._isRetry && path !== '/auth/refresh' && accessToken !== null) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _isRetry: true });
    }
  }

  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(res.status, (body as ApiErrorBody) ?? null);
  }
  return body as T;
}
