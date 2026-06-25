'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Inbox, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import type { DashboardResponse, DealSummary } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant, roleLabel } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';
import { cn } from '@/lib/utils';

// Statuses that count as "active"
const ACTIVE_STATUSES = new Set([
  'Created',
  'Invited',
  'Agreed',
  'Verified',
  'Confirmed',
  'Funded',
  'SellerHandover',
  'MiddlemanVerified',
  'Delivered',
  'Approved',
  'PayoutQueued',
  'MilestoneReleased',
  'Disputed',
  'Paused',
]);

// Statuses that count as "completed"
const COMPLETED_STATUSES = new Set([
  'Released',
  'PartiallySettled',
  'Refunded',
  'Cancelled',
  'Expired',
]);

type FilterTab = 'all' | 'buyer' | 'seller' | 'active' | 'completed';

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buyer', label: 'As Buyer' },
  { id: 'seller', label: 'As Seller' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

const ROLE_PILL: Record<string, string> = {
  buyer: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  seller: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  middleman: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
};

function formatCents(cents: string | null): string {
  if (cents === null) return '—';
  const n = Number(cents);
  return Number.isFinite(n) ? formatUsdCents(n) : '—';
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function DealCard({ deal }: { deal: DealSummary }) {
  return (
    <Link href={`/deals/${deal.id}`} className="block group">
      <Card className="h-full transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
        <CardContent className="p-4 space-y-2.5">
          {/* Top row: short ID + status badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              #{deal.id.slice(0, 8)}
            </span>
            <Badge variant={dealStatusVariant(deal.status)}>
              {dealStatusLabel(deal.status)}
            </Badge>
          </div>

          {/* Role badge */}
          <div>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                ROLE_PILL[deal.role] ?? '',
              )}
            >
              {roleLabel(deal.role)}
            </span>
          </div>

          {/* Coin + network */}
          <p className="text-xs text-muted-foreground">
            {deal.coin} · {deal.network}
          </p>

          {/* Amount */}
          <p className="text-base font-bold">{formatCents(deal.dealAmountCents)}</p>

          {/* Counterparty */}
          <p className="text-xs text-muted-foreground">↔ —</p>

          {/* Date */}
          <p className="text-xs text-muted-foreground">Created {daysAgo(deal.createdAt)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const messages: Record<FilterTab, string> = {
    all: 'No deals yet',
    buyer: 'No deals as buyer',
    seller: 'No deals as seller',
    active: 'No active deals',
    completed: 'No completed deals',
  };
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-16 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{messages[tab]}</p>
      <Button asChild variant="outline">
        <Link href="/deals/new">
          <Plus className="mr-1.5 h-4 w-4" />
          Create your first deal
        </Link>
      </Button>
    </div>
  );
}

export default function DealsPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all');

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/deals');
    // Operators manage deals from the admin all-deals view, not the client list.
    else if (status === 'authenticated' && user?.role === 'middleman') router.replace('/admin/deals');
  }, [status, user, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-deals'],
    enabled: status === 'authenticated',
    queryFn: async () => {
      const res = await apiRequest<DashboardResponse>('/dashboard');
      return res.deals;
    },
  });

  const deals = data ?? [];

  const filtered = React.useMemo(() => {
    switch (activeTab) {
      case 'buyer':
        return deals.filter((d) => d.role === 'buyer');
      case 'seller':
        return deals.filter((d) => d.role === 'seller');
      case 'active':
        return deals.filter((d) => ACTIVE_STATUSES.has(d.status));
      case 'completed':
        return deals.filter((d) => COMPLETED_STATUSES.has(d.status));
      default:
        return deals;
    }
  }, [deals, activeTab]);

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">My Deals</h1>
        <Button asChild variant="gradient">
          <Link href="/deals/new">
            New Deal
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Filter tabs – bottom-border active indicator */}
      <div className="flex border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Unable to load deals. Please refresh the page.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
