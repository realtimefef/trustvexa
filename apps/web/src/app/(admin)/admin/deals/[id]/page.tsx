'use client';

/**
 * Dedicated operator deal page (admin == middleman). Opening a deal from the
 * all-deals list lands here on its own URL (/admin/deals/<id>) instead of an
 * inline expander, so the operator gets the full both-sides view: deal terms,
 * the buyer side and the seller side handled separately, every chat channel,
 * risk flags and private notes — the same deal id controlling both sides, the
 * same way one chat id controls both sides in /admin/connect.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, RefreshCw, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';
import { useAuth } from '@/lib/auth/auth-context';
import type { DealDetail } from '@/lib/api/types';
import { ExpandedDealPanel, type AdminChat } from '../../page';

function fmtCents(v: string | null | undefined): string {
  if (!v) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? formatUsdCents(n) : '—';
}

export default function AdminDealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dealId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=/admin/deals/${dealId}`);
  }, [status, router, dealId]);

  const dealQ = useQuery({
    queryKey: ['admin-deal-detail', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: () => apiRequest<DealDetail>(`/dashboard/deals/${dealId}`),
  });

  const chatsQ = useQuery({
    queryKey: ['admin-chats-all'],
    enabled: status === 'authenticated',
    queryFn: async () => (await apiRequest<{ chats: AdminChat[] }>('/admin/chats')).chats,
  });

  const deal = dealQ.data;
  const allChats = chatsQ.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header / breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link href="/admin/deals"><ArrowLeft className="h-4 w-4 mr-1" /> All deals</Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm text-muted-foreground">{dealId.slice(0, 8)}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { void dealQ.refetch(); void chatsQ.refetch(); }}>
          <RefreshCw className={`h-3.5 w-3.5 ${dealQ.isFetching || chatsQ.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary banner */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4">
          {dealQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : dealQ.isError ? (
            <p className="text-sm text-destructive">Failed to load this deal.</p>
          ) : deal ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-sm font-semibold">{fmtCents(deal.dealAmountCents)} <span className="font-normal text-muted-foreground">{deal.coin} · {deal.network}</span></p>
              </div>
              <div>
                <p className="text-xs text-blue-600">💳 Buyer sends</p>
                <p className="text-sm font-semibold text-blue-600">{fmtCents(deal.buyerTotalCents)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">💰 Seller gets</p>
                <p className="text-sm font-semibold text-emerald-600">{fmtCents(deal.sellerPayoutCents)}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/connect"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Operator chat</Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Deal not found.</p>
          )}
        </CardContent>
      </Card>

      {/* Both-sides panel: Deal Details / All Chats / Party Details / Risk & Notes */}
      {status !== 'authenticated' ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <Card className="rounded-2xl shadow-soft overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Both sides — buyer &amp; seller, terms, chats and notes</p>
          </div>
          <ExpandedDealPanel item={{ id: dealId }} allChats={allChats} />
        </Card>
      )}
    </div>
  );
}
