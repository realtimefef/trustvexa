'use client';

/**
 * Admin all-deals view (admin == middleman). Unlike the client "My Deals" page,
 * this lists EVERY deal on the platform and lets the operator open any deal to
 * see BOTH the buyer and seller sides — deal terms, what each party filled in,
 * the three chats, risk flags, and private notes — the same way one deal/chat
 * id controls both sides. Reuses the work-queue ExpandedDealPanel.
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, RefreshCw, Search, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/api/client';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { useAuth } from '@/lib/auth/auth-context';

interface AdminDeal {
  id: string;
  status: string;
  riskScore: number | null;
  dealAmountCents: string | null;
  coin: string;
  network: string;
  legalHold: boolean;
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
  createdAt: string | null;
}

function fmtCents(cents: string | null): string {
  if (!cents) return '—';
  const n = Number(cents) / 100;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DealRow({ deal }: { deal: AdminDeal }) {
  return (
    <Link href={`/admin/deals/${deal.id}`}
      className="block rounded-xl border transition-shadow hover:shadow-sm">
      <div className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors rounded-xl">
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{deal.id.slice(0, 8)}</span>
          <Badge variant={dealStatusVariant(deal.status)} className="text-[10px] w-fit">{dealStatusLabel(deal.status)}</Badge>
          <div className="text-sm font-semibold">{fmtCents(deal.dealAmountCents)} <span className="font-normal text-muted-foreground text-xs">{deal.coin}</span></div>
          <div className="flex items-center gap-1.5">
            {deal.riskScore !== null && <Badge variant={deal.riskScore >= 50 ? 'warning' : 'secondary'} className="text-[10px]">Risk {deal.riskScore}</Badge>}
            {deal.legalHold && <Badge variant="destructive" className="text-[10px]">Legal hold</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">{deal.middlemanId ? '⚖️ MM assigned' : 'No middleman'}</span>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function AdminDealsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');

  React.useEffect(() => { if (status === 'anonymous') router.replace('/login?next=/admin/deals'); }, [status, router]);

  const dealsQuery = useQuery({
    queryKey: ['admin-deals', search, statusFilter],
    enabled: status === 'authenticated',
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      return (await apiRequest<{ deals: AdminDeal[] }>(`/admin/deals?${params.toString()}`)).deals;
    },
  });

  const deals = dealsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">All Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every deal on the platform. Click one to open its own page — both the buyer and seller sides, terms, chats, risk, and notes.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void dealsQuery.refetch()}>
          <RefreshCw className={`h-3.5 w-3.5 ${dealsQuery.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Deal ID, coin…" className="h-8 pl-8 text-sm" />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All statuses</SelectItem>
              <SelectItem value="Funded" className="text-xs">Funded</SelectItem>
              <SelectItem value="SellerHandover" className="text-xs">Handover</SelectItem>
              <SelectItem value="Delivered" className="text-xs">Delivered</SelectItem>
              <SelectItem value="Disputed" className="text-xs">Disputed</SelectItem>
              <SelectItem value="Released" className="text-xs">Released</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground ml-auto self-end">{deals.length} deal{deals.length !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      {dealsQuery.isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : dealsQuery.isError ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/20 px-4 py-3">Failed to load deals.</p>
      ) : deals.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
          <ShieldCheck className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No deals match.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map((deal) => <DealRow key={deal.id} deal={deal} />)}
        </div>
      )}
    </div>
  );
}
