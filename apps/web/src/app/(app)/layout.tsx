import { ClientAuthGuard } from '@/components/client-auth-guard';
import { DashboardShell } from '@/components/dashboard-shell';

/**
 * Authenticated app route group layout.
 *
 * Auth is enforced client-side by ClientAuthGuard (not server-side) because
 * in a cross-origin Render deployment the tv_refresh cookie belongs to the
 * API domain and cannot be read by the web server's middleware or server
 * components — causing an infinite /login redirect loop.
 *
 * ClientAuthGuard reads the in-memory AuthContext status:
 *   loading       → spinner while bootstrap is running
 *   authenticated → render the page
 *   anonymous     → redirect to /login?next=<current path>
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ClientAuthGuard>{children}</ClientAuthGuard>
    </DashboardShell>
  );
}
