import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthResponse } from '@/lib/api/types';

export type RequiredRole = 'user' | 'middleman';

const API_ORIGIN =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

/**
 * Server-side session retrieval.
 *
 * The middleware (src/middleware.ts) handles the /auth/refresh call and injects
 * the result into the `x-auth-payload` request header (base64-encoded JSON).
 * We read from there first to avoid consuming the already-rotated refresh token
 * a second time with another API call.
 *
 * Fall-back: if middleware didn't run (e.g. direct RSC sub-requests), we call
 * the API directly. Cache deduplicates within the same render cycle.
 */
export const getSession = cache(async (): Promise<AuthResponse> => {
  // 1. Try the header injected by middleware (preferred path).
  const headerStore = await headers();
  const payloadHeader = headerStore.get('x-auth-payload');
  if (payloadHeader) {
    try {
      const parsed = JSON.parse(Buffer.from(payloadHeader, 'base64').toString('utf-8'));
      return parsed as AuthResponse;
    } catch {
      // Malformed header — fall through to cookie-based refresh.
    }
  }

  // 2. Fall-back: read the refresh cookie and call the API directly.
  //    This path is hit for RSC sub-requests where middleware is skipped.
  const cookieStore = await cookies();
  const refreshCookie = cookieStore.get('tv_refresh')?.value;

  if (!refreshCookie) {
    redirect('/login');
  }

  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `tv_refresh=${refreshCookie}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      redirect('/login');
    }

    const data = (await res.json()) as AuthResponse;
    return data;
  } catch (err) {
    // Re-throw Next.js redirect errors so that Next.js itself handles the redirection
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err;
    }
    redirect('/login');
  }
});

/**
 * Guard that enforces an active user session exists.
 * Redirects to /login if unauthenticated.
 */
export async function requireSession(): Promise<void> {
  await getSession();
}

/**
 * Enforces server-side role authorization.
 * Redirects to /login if the authenticated user does not have the specified role.
 */
export async function requireRole(role: RequiredRole): Promise<void> {
  const session = await getSession();
  if (session.user.role !== role) {
    redirect('/login');
  }
}
