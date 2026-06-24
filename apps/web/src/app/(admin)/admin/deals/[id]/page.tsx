'use client';

/**
 * Dedicated operator deal page (admin == middleman). Opening a deal from the
 * all-deals list lands here on its own URL (/admin/deals/<id>).
 *
 * The deal is SPLIT into two independent sides — the buyer side and the seller
 * side — exactly the way one chat id controls both sides in /admin/connect.
 * Each side shows everything that party submitted across the whole deal flow,
 * its own agreement/verification state, its own "Open chat" button that deep
 * links to the matching channel (buyer↔mm / seller↔mm), and its own verify
 * action — so the operator can handle each side independently and never mixes
 * the two up. Deal-level controls, the full chat log and risk/notes live below.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Layers, MessageSquare, RefreshCw, ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError, newIdempotencyKey } from '@/lib/api/client';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';
import { useAuth } from '@/lib/auth/auth-context';
import type { DealDetail } from '@/lib/api/types';
import {
  DealActionsPanel, DealChatViewer, RiskNotesPanel, type AdminChat,
} from '../../page';

// ── Party-detail shapes (full field set returned to the assigned middleman) ──
interface SellerSide {
  productName: string | null; productDescription: string | null; requirements: string | null;
  deliveryMethod: string | null; deliveryInstructions: string | null; estimatedDeliveryTime: string | null;
  additionalNotes: string | null; verifiedByMiddleman: boolean; verifiedAt: string | null; submittedAt: string | null;
}
interface BuyerSide {
  receivingPlatform: string | null; receivingAddress: string | null; contactEmail: string | null;
  backupContact: string | null; specialInstructions: string | null; suggestions: string | null;
  confirmedByBuyer: boolean; confirmedAt: string | null;
}
interface PartyResult { sellerDetails: SellerSide | null; buyerDetails: BuyerSide | null }

function fmtCents(v: string | null | undefined): string {
  if (!v) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? formatUsdCents(n) : '—';
}
function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right break-words">{value || '—'}</span>
    </div>
  );
}

/** One independent side of the deal (buyer or seller). */
function SidePanel({
  side, accent, title, icon, agreedAt, chatHref, rows, verified, verifyLabel, onVerify, verifying, verifyErr,
}: {
  side: 'buyer' | 'seller';
  accent: string;
  title: string;
  icon: string;
  agreedAt: string | null | undefined;
  chatHref: string;
  rows: Array<{ label: string; value: string | null | undefined }>;
  verified: boolean;
  verifyLabel: string;
  onVerify: () => void;
  verifying: boolean;
  verifyErr: string | null;
}) {
  const hasAnything = rows.some((r) => r.value);
  return (
    <Card className={`rounded-2xl shadow-soft border-2 ${accent} overflow-hidden`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <span>{icon}</span> {title}
          </p>
          <Badge variant={verified ? 'success' : 'secondary'} className="text-[10px]">
            {verified ? '✓ verified' : 'not verified'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant={agreedAt ? 'success' : 'secondary'} className="text-[10px]">
            {agreedAt ? `agreed ${fmtDate(agreedAt)}` : 'not agreed yet'}
          </Badge>
        </div>

        <div className="rounded-xl border bg-background/60 p-3">
          {hasAnything ? (
            <div className="divide-y divide-border/40">
              {rows.map((r) => (r.value ? <DetailRow key={r.label} label={r.label} value={r.value} /> : null))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              The {side} has not submitted their details yet.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="flex-1 min-w-[140px]">
            <Link href={chatHref}>
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Open {side} ↔ MM chat
            </Link>
          </Button>
          {!verified && (
            <Button size="sm" disabled={verifying} onClick={onVerify}
              className={side === 'buyer' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{verifying ? '…' : verifyLabel}
            </Button>
          )}
        </div>
        {verifyErr && <p className="text-xs text-destructive">{verifyErr}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminDealDetailPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useParams<{ id: string }>();
  const dealId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0]! : '';
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=/admin/deals/${dealId}`);
  }, [status, router, dealId]);

  const dealQ = useQuery({
    queryKey: ['admin-deal-detail', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: () => apiRequest<DealDetail>(`/dashboard/deals/${dealId}`),
  });
  const partyQ = useQuery({
    queryKey: ['admin-party-details', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: async () => {
      try { return await apiRequest<PartyResult>(`/deals/${dealId}/party-details`); }
      catch { return { sellerDetails: null, buyerDetails: null } as PartyResult; }
    },
  });
  const chatsQ = useQuery({
    queryKey: ['admin-chats-all'],
    enabled: status === 'authenticated',
    queryFn: async () => (await apiRequest<{ chats: AdminChat[] }>('/admin/chats')).chats,
  });

  const [verifying, setVerifying] = React.useState<'buyer' | 'seller' | null>(null);
  const [verifyErr, setVerifyErr] = React.useState<{ buyer: string | null; seller: string | null }>({ buyer: null, seller: null });

  const verifySide = async (role: 'buyer' | 'seller') => {
    setVerifying(role);
    setVerifyErr((p) => ({ ...p, [role]: null }));
    try {
      await apiRequest(`/deals/${dealId}/party-details/verify`, {
        method: 'POST', body: { role }, idempotencyKey: newIdempotencyKey(),
      });
      void qc.invalidateQueries({ queryKey: ['admin-party-details', dealId] });
    } catch (e) {
      setVerifyErr((p) => ({ ...p, [role]: e instanceof ApiError ? e.message : 'Verify failed (only the assigned middleman can verify).' }));
    } finally {
      setVerifying(null);
    }
  };

  const deal = dealQ.data;
  const allChats = chatsQ.data ?? [];
  const seller = partyQ.data?.sellerDetails ?? null;
  const buyer = partyQ.data?.buyerDetails ?? null;
  const connId = deal?.connectionId ?? '';

  const buyerChatHref = connId ? `/admin/connect?open=${connId}&channel=buyer_mm` : '/admin/connect';
  const sellerChatHref = connId ? `/admin/connect?open=${connId}&channel=seller_mm` : '/admin/connect';

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header / breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link href="/admin/deals"><ArrowLeft className="h-4 w-4 mr-1" /> All deals</Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm text-muted-foreground">{dealId.slice(0, 8)}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => { void dealQ.refetch(); void partyQ.refetch(); void chatsQ.refetch(); }}>
          <RefreshCw className={`h-3.5 w-3.5 ${dealQ.isFetching || partyQ.isFetching ? 'animate-spin' : ''}`} />
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Deal not found.</p>
          )}
        </CardContent>
      </Card>

      {/* Two independent sides */}
      <div>
        <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
          <Layers className="h-4 w-4 text-primary" /> Both sides — handled independently
        </p>
        {status !== 'authenticated' || partyQ.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <SidePanel
              side="buyer"
              accent="border-blue-500/30"
              title="Buyer side"
              icon="🛒"
              agreedAt={deal?.buyerAgreedAt}
              chatHref={buyerChatHref}
              verified={!!buyer?.confirmedByBuyer}
              verifyLabel="Mark buyer confirmed"
              onVerify={() => void verifySide('buyer')}
              verifying={verifying === 'buyer'}
              verifyErr={verifyErr.buyer}
              rows={[
                { label: 'Buyer ID', value: deal?.buyerId ? deal.buyerId.replace(/-/g, '').slice(0, 8).toUpperCase() : null },
                { label: 'Receiving on', value: buyer?.receivingPlatform },
                { label: 'Address', value: buyer?.receivingAddress },
                { label: 'Contact email', value: buyer?.contactEmail },
                { label: 'Backup contact', value: buyer?.backupContact },
                { label: 'Instructions', value: buyer?.specialInstructions },
                { label: 'Suggestions', value: buyer?.suggestions },
                { label: 'Confirmed at', value: buyer?.confirmedAt ? fmtDate(buyer.confirmedAt) : null },
              ]}
            />
            <SidePanel
              side="seller"
              accent="border-emerald-500/30"
              title="Seller side"
              icon="📦"
              agreedAt={deal?.sellerAgreedAt}
              chatHref={sellerChatHref}
              verified={!!seller?.verifiedByMiddleman}
              verifyLabel="Verify seller details"
              onVerify={() => void verifySide('seller')}
              verifying={verifying === 'seller'}
              verifyErr={verifyErr.seller}
              rows={[
                { label: 'Seller ID', value: deal?.sellerId ? deal.sellerId.replace(/-/g, '').slice(0, 8).toUpperCase() : null },
                { label: 'Product', value: seller?.productName },
                { label: 'Description', value: seller?.productDescription },
                { label: 'Requirements', value: seller?.requirements },
                { label: 'Delivery via', value: seller?.deliveryMethod },
                { label: 'Delivery instructions', value: seller?.deliveryInstructions },
                { label: 'ETA', value: seller?.estimatedDeliveryTime },
                { label: 'Notes', value: seller?.additionalNotes },
                { label: 'Verified at', value: seller?.verifiedAt ? fmtDate(seller.verifiedAt) : null },
              ]}
            />
          </div>
        )}
        {!partyQ.isLoading && !seller && !buyer && (
          <p className="text-xs text-muted-foreground mt-2">
            Submitted side details are only visible when you are the assigned middleman on this deal.
          </p>
        )}
      </div>

      {/* Deal-level controls */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Deal controls
          </p>
          {status === 'authenticated' && (
            <DealActionsPanel dealId={dealId} status={deal?.status ?? ''} qc={qc} />
          )}
        </CardContent>
      </Card>

      {/* All chat channels */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-primary" /> All chat channels (read-only log)
          </p>
          {status === 'authenticated' && <DealChatViewer dealId={dealId} allChats={allChats} />}
        </CardContent>
      </Card>

      {/* Risk & notes */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium">Risk &amp; private notes</p>
          {status === 'authenticated' && <RiskNotesPanel dealId={dealId} />}
        </CardContent>
      </Card>
    </div>
  );
}
