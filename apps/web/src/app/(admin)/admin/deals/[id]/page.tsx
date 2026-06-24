'use client';

/**
 * Dedicated operator deal page (admin == middleman). Opening a deal from the
 * all-deals list lands here on its own URL (/admin/deals/<id>).
 *
 * The deal is SPLIT into two independent sides — buyer and seller — the way one
 * deal id controls both sides. Each side shows its own money (buyer sends /
 * seller receives), everything that party submitted across the deal flow
 * (including their receiving/payment details), its agreement + verification
 * state, its own "Open chat" deep link to the matching channel, and its own
 * controls so the operator acts on each side independently. Whole-deal controls
 * (finalize / dispute / cancel) and risk & notes live below.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, Layers, MessageSquare, RefreshCw, Send,
  Shield, ShieldCheck, AlertTriangle, X, Eye,
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
import { RiskNotesPanel } from '../../page';

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

const TERMINAL = new Set(['Released', 'Refunded', 'PartiallySettled', 'Cancelled', 'Expired']);

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

function DetailRow({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
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

  // ── Actions (shared runner) ───────────────────────────────────────────────
  const [busy, setBusy] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, okText: string) => {
    setBusy(key); setMsg(null);
    try {
      await fn();
      setMsg({ kind: 'ok', text: okText });
      void qc.invalidateQueries({ queryKey: ['admin-deal-detail', dealId] });
      void qc.invalidateQueries({ queryKey: ['admin-party-details', dealId] });
      void qc.invalidateQueries({ queryKey: ['admin-deals'] });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Action failed.' });
    } finally {
      setBusy(null);
    }
  };

  const verifySide = (role: 'buyer' | 'seller') =>
    run(`verify-${role}`, () => apiRequest(`/deals/${dealId}/party-details/verify`, { method: 'POST', body: { role }, idempotencyKey: newIdempotencyKey() }),
      role === 'buyer' ? 'Buyer side confirmed.' : 'Seller side verified.');
  const verifyHandover = () =>
    run('handover', () => apiRequest(`/deals/${dealId}/handover/verify`, { method: 'POST', idempotencyKey: newIdempotencyKey() }), 'Handover verified.');
  const deliverToBuyer = () =>
    run('deliver', () => apiRequest(`/deals/${dealId}/deliver`, { method: 'POST', idempotencyKey: newIdempotencyKey() }), 'Marked delivered to buyer.');
  const markComplete = () => {
    if (!confirm('Mark this deal complete and release the payout to the seller? This cannot be undone.')) return;
    void run('complete', () => apiRequest(`/deals/${dealId}/complete`, { method: 'POST', idempotencyKey: newIdempotencyKey() }), 'Deal completed and payout released.');
  };
  const openDispute = () => {
    if (!confirm('Mark this deal as Disputed?')) return;
    void run('dispute', () => apiRequest(`/deals/${dealId}/middleman-update`, { method: 'PATCH', body: { statusOverride: 'Disputed', note: 'Middleman opened dispute.' }, idempotencyKey: newIdempotencyKey() }), 'Deal marked disputed.');
  };
  const cancelDeal = () => {
    if (!confirm('Cancel this deal? This is irreversible.')) return;
    void run('cancel', () => apiRequest(`/deals/${dealId}/middleman-update`, { method: 'PATCH', body: { statusOverride: 'Cancelled', note: 'Middleman cancelled.' }, idempotencyKey: newIdempotencyKey() }), 'Deal cancelled.');
  };

  const deal = dealQ.data;
  const seller = partyQ.data?.sellerDetails ?? null;
  const buyer = partyQ.data?.buyerDetails ?? null;
  const connId = deal?.connectionId ?? '';
  const st = deal?.status ?? '';
  const isTerminal = TERMINAL.has(st);

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
        <Button size="sm" variant="outline" onClick={() => { void dealQ.refetch(); void partyQ.refetch(); }}>
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
                <p className="text-xs text-muted-foreground">Deal amount</p>
                <p className="text-sm font-semibold">{fmtCents(deal.dealAmountCents)} <span className="font-normal text-muted-foreground">{deal.coin} · {deal.network}</span></p>
              </div>
              <div>
                <p className="text-xs text-blue-600">💳 Buyer sends</p>
                <p className="text-sm font-semibold text-blue-600">{fmtCents(deal.buyerTotalCents)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600">💰 Seller receives</p>
                <p className="text-sm font-semibold text-emerald-600">{fmtCents(deal.sellerPayoutCents)}</p>
              </div>
              <div className="ml-auto">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/deals/${dealId}`}><Eye className="h-3.5 w-3.5 mr-1.5" /> Full deal page</Link>
                </Button>
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
        {status !== 'authenticated' || dealQ.isLoading || partyQ.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── Buyer side ── */}
            <Card className="rounded-2xl shadow-soft border-2 border-blue-500/30 overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm flex items-center gap-1.5">🛒 Buyer side</p>
                  <Badge variant={buyer?.confirmedByBuyer ? 'success' : 'secondary'} className="text-[10px]">
                    {buyer?.confirmedByBuyer ? '✓ confirmed' : 'not confirmed'}
                  </Badge>
                </div>
                <Badge variant={deal?.buyerAgreedAt ? 'success' : 'secondary'} className="text-[10px]">
                  {deal?.buyerAgreedAt ? `agreed ${fmtDate(deal.buyerAgreedAt)}` : 'not agreed yet'}
                </Badge>

                {/* Money */}
                <div className="rounded-xl border bg-blue-500/5 p-3">
                  <DetailRow label="Buyer sends (total)" value={fmtCents(deal?.buyerTotalCents)} />
                  <DetailRow label="Deal amount" value={fmtCents(deal?.dealAmountCents)} />
                  <DetailRow label="Coin / network" value={deal ? `${deal.coin} · ${deal.network}` : null} />
                </div>

                {/* Submitted details */}
                <div className="rounded-xl border bg-background/60 p-3">
                  {buyer ? (
                    <div className="divide-y divide-border/40">
                      <DetailRow label="Buyer ID" value={deal?.buyerId ? deal.buyerId.replace(/-/g, '').slice(0, 8).toUpperCase() : null} mono />
                      <DetailRow label="Receiving on" value={buyer.receivingPlatform} />
                      <DetailRow label="Receiving address / payment ID" value={buyer.receivingAddress} mono />
                      <DetailRow label="Contact email" value={buyer.contactEmail} />
                      <DetailRow label="Backup contact" value={buyer.backupContact} />
                      <DetailRow label="Instructions" value={buyer.specialInstructions} />
                      <DetailRow label="Suggestions" value={buyer.suggestions} />
                      <DetailRow label="Confirmed at" value={buyer.confirmedAt ? fmtDate(buyer.confirmedAt) : null} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">The buyer has not submitted their receiving details yet.</p>
                  )}
                </div>

                {/* Buyer-side controls */}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 min-w-[130px]">
                    <Link href={buyerChatHref}><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Buyer ↔ MM chat</Link>
                  </Button>
                  {!buyer?.confirmedByBuyer && (
                    <Button size="sm" disabled={busy === 'verify-buyer'} onClick={() => void verifySide('buyer')} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{busy === 'verify-buyer' ? '…' : 'Confirm buyer'}
                    </Button>
                  )}
                  {st === 'MiddlemanVerified' && (
                    <Button size="sm" disabled={busy === 'deliver'} onClick={deliverToBuyer} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Send className="h-3.5 w-3.5 mr-1.5" />{busy === 'deliver' ? '…' : 'Deliver to buyer'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Seller side ── */}
            <Card className="rounded-2xl shadow-soft border-2 border-emerald-500/30 overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm flex items-center gap-1.5">📦 Seller side</p>
                  <Badge variant={seller?.verifiedByMiddleman ? 'success' : 'secondary'} className="text-[10px]">
                    {seller?.verifiedByMiddleman ? '✓ verified' : 'not verified'}
                  </Badge>
                </div>
                <Badge variant={deal?.sellerAgreedAt ? 'success' : 'secondary'} className="text-[10px]">
                  {deal?.sellerAgreedAt ? `agreed ${fmtDate(deal.sellerAgreedAt)}` : 'not agreed yet'}
                </Badge>

                {/* Money */}
                <div className="rounded-xl border bg-emerald-500/5 p-3">
                  <DetailRow label="Seller receives (payout)" value={fmtCents(deal?.sellerPayoutCents)} />
                  <DetailRow label="Deal amount" value={fmtCents(deal?.dealAmountCents)} />
                  <DetailRow label="Settlement fee" value={fmtCents(deal?.sellerSettlementFeeCents)} />
                </div>

                {/* Submitted details */}
                <div className="rounded-xl border bg-background/60 p-3">
                  {seller ? (
                    <div className="divide-y divide-border/40">
                      <DetailRow label="Seller ID" value={deal?.sellerId ? deal.sellerId.replace(/-/g, '').slice(0, 8).toUpperCase() : null} mono />
                      <DetailRow label="Product" value={seller.productName} />
                      <DetailRow label="Description" value={seller.productDescription} />
                      <DetailRow label="Requirements" value={seller.requirements} />
                      <DetailRow label="Delivery via" value={seller.deliveryMethod} />
                      <DetailRow label="Delivery instructions" value={seller.deliveryInstructions} />
                      <DetailRow label="ETA" value={seller.estimatedDeliveryTime} />
                      <DetailRow label="Notes" value={seller.additionalNotes} />
                      <DetailRow label="Verified at" value={seller.verifiedAt ? fmtDate(seller.verifiedAt) : null} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">The seller has not submitted their product/delivery details yet.</p>
                  )}
                </div>

                {/* Seller-side controls */}
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1 min-w-[130px]">
                    <Link href={sellerChatHref}><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Seller ↔ MM chat</Link>
                  </Button>
                  {!seller?.verifiedByMiddleman && (
                    <Button size="sm" disabled={busy === 'verify-seller'} onClick={() => void verifySide('seller')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{busy === 'verify-seller' ? '…' : 'Verify seller'}
                    </Button>
                  )}
                  {st === 'SellerHandover' && (
                    <Button size="sm" disabled={busy === 'handover'} onClick={verifyHandover} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Shield className="h-3.5 w-3.5 mr-1.5" />{busy === 'handover' ? '…' : 'Verify handover'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {!partyQ.isLoading && !seller && !buyer && (
          <p className="text-xs text-muted-foreground mt-2">
            Submitted side details are only visible when you are the assigned middleman on this deal.
          </p>
        )}
      </div>

      {/* Whole-deal controls */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" /> Whole-deal controls
          </p>
          <div className="flex flex-wrap gap-2">
            {(st === 'Delivered' || st === 'Approved' || st === 'PayoutQueued') && (
              <Button size="sm" disabled={busy === 'complete'} onClick={markComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{busy === 'complete' ? '…' : 'Complete & release'}
              </Button>
            )}
            {st === 'Disputed' ? (
              <Button size="sm" asChild variant="outline" className="border-amber-500/40 text-amber-600">
                <Link href={`/admin/disputes/${dealId}`}><AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Resolve dispute</Link>
              </Button>
            ) : !isTerminal && (
              <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10" disabled={busy === 'dispute'} onClick={openDispute}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />{busy === 'dispute' ? '…' : 'Open dispute'}
              </Button>
            )}
            {!isTerminal && (
              <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={busy === 'cancel'} onClick={cancelDeal}>
                <X className="h-3.5 w-3.5 mr-1.5" />{busy === 'cancel' ? '…' : 'Cancel deal'}
              </Button>
            )}
          </div>
          {msg && <p className={`text-xs ${msg.kind === 'ok' ? 'text-emerald-600' : 'text-destructive'}`}>{msg.kind === 'ok' ? '✓ ' : '⚠ '}{msg.text}</p>}
          {isTerminal && <p className="text-xs text-muted-foreground">This deal is in a final state — no further actions.</p>}
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
