import { requireRole } from '@/lib/auth/guard';
import { AdminShell } from '@/components/admin-shell';

// Middleman-only (admin) route group. Server-side role guard runs first, then the
// client admin console shell provides the sidebar + top bar chrome.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole('middleman');
  return <AdminShell>{children}</AdminShell>;
}
