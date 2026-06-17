import { requireSession } from '@/lib/auth/guard';
import { DashboardShell } from '@/components/dashboard-shell';

// Authenticated app route group (buyer/seller dashboards, deals, helper pages).
// Server-side session guard runs first, then the client dashboard shell provides
// the sidebar + top bar chrome.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <DashboardShell>{children}</DashboardShell>;
}
