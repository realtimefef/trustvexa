'use client';

/**
 * ClientAuthGuard — replaces the server-side requireSession() guard.
 *
 * WHY CLIENT-SIDE:
 * The tv_refresh cookie is set by the API service (different domain on Render).
 * Server-side code can never read a cookie that belongs to another domain.
 * requireSession() would always redirect to /login in production.
 *
 * This component reads the in-memory auth state from AuthContext, which is
 * populated by the client-side bootstrap (/auth/refresh is called on mount
 * with credentials:include — the browser DOES send the cross-domain cookie
 * to the API since the fetch goes directly to the API origin).
 *
 * Flow:
 *   'loading'       → show skeleton (bootstrap in progress)
 *   'authenticated' → render children
 *   'anonymous'     → redirect to /login?next=<current path>
 */
import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

interface Props {
  children: React.ReactNode;
}

export function ClientAuthGuard({ children }: Props) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === 'anonymous') {
      // Preserve the full path + query string (e.g. /connect?join=CODE) so the
      // user returns to the exact link — and any auto-join — after logging in.
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(`/login?next=${encodeURIComponent(pathname + search)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    // Show a minimal skeleton while the auth bootstrap resolves.
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    // Already redirecting via useEffect — render nothing in the meantime.
    return null;
  }

  return <>{children}</>;
}
