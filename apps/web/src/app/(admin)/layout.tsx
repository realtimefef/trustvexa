import { ClientAuthGuard } from '@/components/client-auth-guard';
import { ClientRoleGuard } from '@/components/client-role-guard';
import { AdminShell } from '@/components/admin-shell';

/**
 * Middleman-only (admin) route group layout.
 * Auth + role check done client-side (same reason as app layout — server-side
 * cookie reads fail in cross-origin Render deployments).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminShell>
      <ClientAuthGuard>
        <ClientRoleGuard requiredRole="middleman">
          {children}
        </ClientRoleGuard>
      </ClientAuthGuard>
    </AdminShell>
  );
}
