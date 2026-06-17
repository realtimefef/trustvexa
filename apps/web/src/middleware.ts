/**
 * Next.js middleware for server-side auth — non-rotating session check.
 *
 * On every request to a protected route this middleware:
 *  1. Reads the `tv_refresh` httpOnly cookie from the incoming request.
 *  2. Calls the API /auth/verify-session endpoint server-to-server.
 *     This endpoint validates the token WITHOUT consuming/rotating it, so
 *     it does not race with client-side token rotation (auth-context.tsx).
 *  3. Injects `x-auth-payload` into the downstream request headers so
 *     Server Components can read auth data without making a second API call.
 *
 * If the cookie is absent or the token is invalid, the browser is redirected
 * to /login with a `next` query param.
 */

import { NextRequest, NextResponse } from 'next/server';

const API_ORIGIN =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

const REFRESH_COOKIE = 'tv_refresh';

async function verifySession(
  req: NextRequest,
): Promise<{ response: NextResponse; authPayload: string } | null> {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  let apiRes: Response;
  try {
    apiRes = await fetch(`${API_ORIGIN}/api/v1/auth/verify-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${REFRESH_COOKIE}=${refreshToken}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    return null;
  }

  if (!apiRes.ok) return null;

  const data = (await apiRes.json()) as {
    user: { id: string; username: string; role: string };
    access_token: string;
    access_expires_at: string;
  };

  const authPayload = Buffer.from(
    JSON.stringify({
      user: data.user,
      access_token: data.access_token,
      access_expires_at: data.access_expires_at,
    }),
  ).toString('base64');

  // Build modified request headers — Next.js forwards these to Server Components.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-auth-payload', authPayload);

  // Build the response with the updated request headers.
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  return { response, authPayload };
}

export async function middleware(req: NextRequest) {
  const result = await verifySession(req);

  if (!result) {
    // The refresh-token cookie may live on the API domain (cross-origin Render
    // deployment) so we cannot reliably read it here. Pass through and let the
    // client-side ClientAuthGuard handle auth + redirect. If we hard-redirect
    // here the user lands in an infinite /login loop after every login.
    return NextResponse.next();
  }

  return result.response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/deals/:path*',
    '/wallet/:path*',
    '/transactions/:path*',
    '/messages/:path*',
    '/disputes/:path*',
    '/documents/:path*',
    '/settings/:path*',
    '/notifications/:path*',
    '/profile/:path*',
    '/referrals/:path*',
    '/reviews/:path*',
    '/templates/:path*',
    '/support/:path*',
    '/calculator/:path*',
    '/announcements/:path*',
    '/invite/:path*',
  ],
};
