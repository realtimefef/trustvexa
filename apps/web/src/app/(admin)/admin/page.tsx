'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Clock, FileText, Gavel, Layers, MessageCircle, MessageSquare,
  Send, Shield, Settings, TicketIcon, BarChart3,
  ListChecks, DollarSign, Eye, Users, X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError, newIdempotencyKey } from '@/lib/api/client';
import type {
  AdminDispute, AdminDisputesResponse, DealDetail,
  MiddlemanQueueResponse, NextAction, QueueItem,
} from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';

// ── Local types ───────────────────────────────────────────────────────────────

interface AdminChat {
  id: string; dealId: string; type: string; status: string;
  createdAt: string; buyerId: string | null; sellerId: string | null; middlemanId: string | null;
}
interface ChatMessage {
  id: string; senderId: string | null; body: string | null;
  isEdited: boolean; deletedForUsers: boolean; createdAt: string;
}
interface PartyDetailsResult {
  sellerDetails: { productName: string|null; productDescription: string|null; deliveryMethod: string|null; deliveryInstructions: string|null; verifiedByMiddleman: boolean } | null;
  buyerDetails: { receivingPlatform: string|null; receivingAddress: string|null; contactEmail: string|null; confirmedByBuyer: boolean } | null;
}

const CHAT_TYPE_LABELS: Record<string, string> = {
  buyer_seller: '👥 Buyer ↔ Seller', buyer_mm: '🛡 Buyer ↔ Middleman', seller_mm: '🤝 Seller ↔ Middleman',
};
const TERMINAL = new Set(['Released','Refunded','PartiallySettled','Cancelled','Expired']);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCents(v: string | null): string {
  if (!v) return '—'; const n = Number(v); return Number.isFinite(n) ? formatUsdCents(n) : '—';
}
function fmtDate(v: string | null): string {
  if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function fmtDateShort(v: string | null): string {
  if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
function primaryAction(actions: NextAction[]): NextAction | undefined {
  return actions.find(a => a.blocking) ?? actions[0];
}

function useSupportStats(en: boolean) {
  return useQuery({ queryKey: ['admin-support-stats'], enabled: en, staleTime: 60_000,
    queryFn: async () => {
      const res = await apiRequest<{ tickets: unknown[]; stats: Record<string, number> }>('/support/admin/tickets?status=open');
      return { open: res.stats?.open ?? 0, urgent: (res.stats?.urgent ?? 0) + (res.stats?.money_issue ?? 0), total: res.tickets.length };
    } });
}

// ── Queries ───────────────────────────────────────────────────────────────────

function useQueue(en: boolean) {
  return useQuery({ queryKey: ['admin-queue'], enabled: en,
    queryFn: () => apiRequest<MiddlemanQueueResponse>('/admin/queue') });
}
function useDisputes(en: boolean) {
  return useQuery({ queryKey: ['admin-disputes'], enabled: en,
    queryFn: async () => (await apiRequest<AdminDisputesResponse>('/admin/disputes')).disputes });
}
function useAdminChats(en: boolean) {
  return useQuery({ queryKey: ['admin-chats-all'], enabled: en,
    queryFn: async () => (await apiRequest<{ chats: AdminChat[] }>('/admin/chats')).chats });
}
function useDealDetail(dealId: string | null, en: boolean) {
  return useQuery({ queryKey: ['admin-deal-detail', dealId], enabled: en && !!dealId,
    queryFn: () => apiRequest<DealDetail>(`/dashboard/deals/${dealId!}`) });
}
function usePartyDetails(dealId: string | null, en: boolean) {
  return useQuery({ queryKey: ['admin-party-details', dealId], enabled: en && !!dealId,
    queryFn: async () => {
      try { return await apiRequest<PartyDetailsResult>(`/deals/${dealId!}/party-details`); }
      catch { return { sellerDetails: null, buyerDetails: null }; }
    } });
}
function useChatMessages(chatId: string | null, en: boolean) {
  return useQuery({ queryKey: ['admin-chat-msgs', chatId], enabled: en && !!chatId,
    queryFn: async () => (await apiRequest<{ messages: ChatMessage[] }>(`/chats/${chatId!}/messages`)).messages,
    staleTime: 30_000 });
}

// ── Deal Chat Viewer ──────────────────────────────────────────────────────────

function DealChatViewer({ dealId, allChats }: { dealId: string; allChats: AdminChat[] }) {
  const dealChats = allChats.filter(c => c.dealId === dealId);
  const [selChatId, setSelChatId] = React.useState<string | null>(dealChats[0]?.id ?? null);
  React.useEffect(() => { if (dealChats.length && !selChatId) setSelChatId(dealChats[0]?.id ?? null); }, [dealChats, selChatId]);
  const msgsQ = useChatMessages(selChatId, true);

  if (dealChats.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No chats found for this deal.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Chat tabs */}
      <div className="flex flex-wrap gap-1.5">
        {dealChats.map(c => (
          <button key={c.id} type="button" onClick={() => setSelChatId(c.id)}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${selChatId === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted/60'}`}>
            {CHAT_TYPE_LABELS[c.type] ?? c.type}
            <span className={`ml-1.5 text-[9px] rounded-full px-1 ${c.status === 'open' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              {c.status}
            </span>
          </button>
        ))}
      </div>
      {/* Messages */}
      <div className="rounded-xl border bg-muted/10 p-3 space-y-2 max-h-72 overflow-y-auto">
        {msgsQ.isLoading ? <Skeleton className="h-16 w-full" /> :
         msgsQ.isError ? <p className="text-xs text-destructive">Could not load messages.</p> :
         (msgsQ.data?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No messages yet.</p> :
          msgsQ.data!.map(msg => (
            <div key={msg.id} className="flex gap-2 text-xs">
              <span className="shrink-0 font-mono text-muted-foreground/70 w-16 text-[10px] pt-0.5">
                {msg.senderId ? msg.senderId.slice(0,8) : 'System'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground break-words">{msg.body ?? <em className="text-muted-foreground">deleted</em>}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{fmtDate(msg.createdAt)}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── Deal Actions Panel ────────────────────────────────────────────────────────

function DealActionsPanel({ dealId, status, qc }: { dealId: string; status: string; qc: ReturnType<typeof useQueryClient> }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [amountInput, setAmountInput] = React.useState('');
  const [termsInput, setTermsInput] = React.useState('');
  const [showModify, setShowModify] = React.useState(false);

  const doAction = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name); setErr(null); setOk(null);
    try { await fn(); setOk(name); void qc.invalidateQueries({ queryKey: ['admin-queue'] }); void qc.invalidateQueries({ queryKey: ['admin-deal-detail', dealId] }); }
    catch (e) { setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Action failed.'); }
    finally { setBusy(null); }
  };

  const verifyHandover = () => doAction('verify', () => apiRequest(`/deals/${dealId}/handover/verify`, { method: 'POST', idempotencyKey: newIdempotencyKey() }));
  const deliverToBuyer = () => doAction('deliver', () => apiRequest(`/deals/${dealId}/deliver`, { method: 'POST', idempotencyKey: newIdempotencyKey() }));
  const markComplete = () => {
    if (!confirm('Mark this deal complete and release the payout to the seller? This cannot be undone.')) return;
    void doAction('complete', () => apiRequest(`/deals/${dealId}/complete`, { method: 'POST', idempotencyKey: newIdempotencyKey() }));
  };
  const cancelDeal = () => {
    if (!confirm('Cancel this deal? This is irreversible.')) return;
    void doAction('cancel', () => apiRequest(`/deals/${dealId}/middleman-update`, { method: 'PATCH', body: { statusOverride: 'Cancelled', note: 'Middleman cancelled.' }, idempotencyKey: newIdempotencyKey() }));
  };
  const openDispute = () => {
    if (!confirm('Mark this deal as Disputed?')) return;
    void doAction('dispute', () => apiRequest(`/deals/${dealId}/middleman-update`, { method: 'PATCH', body: { statusOverride: 'Disputed', note: 'Middleman opened dispute.' }, idempotencyKey: newIdempotencyKey() }));
  };
  const modifyDeal = () => doAction('modify', () => apiRequest(`/deals/${dealId}/middleman-update`, {
    method: 'PATCH',
    body: { ...(amountInput ? { dealAmountCents: Math.round(Number(amountInput) * 100) } : {}), ...(termsInput.trim() ? { terms: termsInput.trim() } : {}), note: 'Updated by middleman.' },
    idempotencyKey: newIdempotencyKey(),
  }));

  const isTerminal = TERMINAL.has(status);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick actions</p>
      <div className="flex flex-wrap gap-2">
        {status === 'SellerHandover' && (
          <Button size="sm" disabled={!!busy} onClick={verifyHandover} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Shield className="h-3.5 w-3.5 mr-1.5" />{busy === 'verify' ? 'Verifying…' : 'Verify Handover'}
          </Button>
        )}
        {status === 'MiddlemanVerified' && (
          <Button size="sm" disabled={!!busy} onClick={deliverToBuyer} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="h-3.5 w-3.5 mr-1.5" />{busy === 'deliver' ? 'Delivering…' : 'Deliver to Buyer'}
          </Button>
        )}
        {(status === 'Delivered' || status === 'Approved' || status === 'PayoutQueued') && (
          <Button size="sm" disabled={!!busy} onClick={markComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{busy === 'complete' ? 'Completing…' : 'Mark Complete & Release'}
          </Button>
        )}
        {status === 'Disputed' && (
          <Button size="sm" asChild variant="outline" className="border-amber-500/40 text-amber-600">
            <Link href={`/admin/disputes/${dealId}`}><Gavel className="h-3.5 w-3.5 mr-1.5" />Resolve Dispute</Link>
          </Button>
        )}
        {!isTerminal && status !== 'Disputed' && (
          <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10" disabled={!!busy} onClick={openDispute}>
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />{busy === 'dispute' ? '…' : 'Open Dispute'}
          </Button>
        )}
        {!isTerminal && status !== 'Cancelled' && (
          <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={!!busy} onClick={cancelDeal}>
            <X className="h-3.5 w-3.5 mr-1.5" />{busy === 'cancel' ? '…' : 'Cancel Deal'}
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link href={`/deals/${dealId}`}><Eye className="h-3.5 w-3.5 mr-1.5" />Full Deal Page</Link>
        </Button>
        {!isTerminal && (
          <Button size="sm" variant="ghost" onClick={() => setShowModify(v => !v)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" />Modify Deal
          </Button>
        )}
      </div>
      {showModify && (
        <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-3">
          <p className="text-xs font-semibold">Modify deal (middleman override)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label className="text-xs">New amount (USD)</Label>
              <Input value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="e.g. 1500" type="number" min="0" className="h-8 text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Update terms</Label>
              <Input value={termsInput} onChange={e => setTermsInput(e.target.value)} placeholder="New terms text…" className="h-8 text-xs" /></div>
          </div>
          <Button size="sm" disabled={!!busy || (!amountInput && !termsInput.trim())} onClick={modifyDeal}>
            {busy === 'modify' ? 'Saving…' : 'Apply changes'}
          </Button>
        </div>
      )}
      {err && <p className="text-xs text-destructive">⚠ {err}</p>}
      {ok && <p className="text-xs text-emerald-600">✓ Action completed.</p>}
    </div>
  );
}

// ── Expanded Deal Panel ───────────────────────────────────────────────────────

function ExpandedDealPanel({ item, allChats }: { item: QueueItem; allChats: AdminChat[] }) {
  const qc = useQueryClient();
  const [tab, setTab] = React.useState<'details' | 'chats' | 'parties'>('details');
  const detailQ = useDealDetail(item.id, true);
  const partyQ = usePartyDetails(item.id, tab === 'parties');
  const deal = detailQ.data;

  return (
    <div className="border-t bg-muted/5 px-4 py-4 space-y-4">
      {/* Tab nav */}
      <div className="flex gap-1 rounded-lg bg-muted/30 p-0.5 w-fit">
        {([['details','Deal Details'],['chats','All Chats'],['parties','Party Details']] as const).map(([k,label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${tab === k ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Details tab */}
      {tab === 'details' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            {detailQ.isLoading ? <Skeleton className="h-32 w-full" /> : deal ? (
              <div className="rounded-xl border bg-background/60 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Deal ID</span><span className="font-mono text-xs">{deal.id.slice(0,8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Coin / Network</span><span>{deal.coin} · {deal.network}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deal amount</span><span className="font-semibold">{fmtCents(deal.dealAmountCents)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-blue-600">💳 Buyer sends</span><span className="font-bold text-blue-600">{fmtCents(deal.buyerTotalCents)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground text-emerald-600">💰 Seller gets</span><span className="font-bold text-emerald-600">{fmtCents(deal.sellerPayoutCents)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fee payer</span><span className="capitalize">{deal.feePayer ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Buyer ID</span><span className="font-mono text-xs">{deal.buyerId?.slice(0,8) ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Seller ID</span><span className="font-mono text-xs">{deal.sellerId?.slice(0,8) ?? '—'}</span></div>
                {deal.fundBy && <div className="flex justify-between"><span className="text-muted-foreground">Fund by</span><span className="text-xs">{fmtDate(deal.fundBy)}</span></div>}
                {deal.lockedAt && <div className="flex justify-between"><span className="text-muted-foreground">Locked</span><span className="text-xs text-emerald-600">{fmtDate(deal.lockedAt)}</span></div>}
              </div>
            ) : <p className="text-xs text-destructive">Could not load deal detail.</p>}
          </div>
          <DealActionsPanel dealId={item.id} status={item.status} qc={qc} />
        </div>
      )}

      {/* Chats tab */}
      {tab === 'chats' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">All 3 deal chat channels. As middleman you can read every channel.</p>
          <DealChatViewer dealId={item.id} allChats={allChats} />
          <Button asChild size="sm" variant="outline" className="mt-2">
            <Link href="/messages"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Open full messages page</Link>
          </Button>
        </div>
      )}

      {/* Parties tab */}
      {tab === 'parties' && (
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          {partyQ.isLoading ? <Skeleton className="h-32 w-full col-span-2" /> : (
            <>
              <div className="rounded-xl border bg-background/60 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-emerald-600 mb-2">Seller details</p>
                {partyQ.data?.sellerDetails ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Product</span><span>{partyQ.data.sellerDetails.productName ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{partyQ.data.sellerDetails.deliveryMethod ?? '—'}</span></div>
                    {partyQ.data.sellerDetails.deliveryInstructions && (
                      <div className="pt-1"><p className="text-muted-foreground text-xs">Instructions:</p>
                        <p className="text-xs">{partyQ.data.sellerDetails.deliveryInstructions}</p></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Verified</span>
                      <Badge variant={partyQ.data.sellerDetails.verifiedByMiddleman ? 'success' : 'secondary'}>{partyQ.data.sellerDetails.verifiedByMiddleman ? '✓ Yes' : 'No'}</Badge></div>
                  </>
                ) : <p className="text-xs text-muted-foreground">No seller details submitted yet.</p>}
              </div>
              <div className="rounded-xl border bg-background/60 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-600 mb-2">Buyer details</p>
                {partyQ.data?.buyerDetails ? (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span>{partyQ.data.buyerDetails.receivingPlatform ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span className="font-mono text-xs truncate max-w-[140px]">{partyQ.data.buyerDetails.receivingAddress ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs">{partyQ.data.buyerDetails.contactEmail ?? '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Confirmed</span>
                      <Badge variant={partyQ.data.buyerDetails.confirmedByBuyer ? 'success' : 'secondary'}>{partyQ.data.buyerDetails.confirmedByBuyer ? '✓ Yes' : 'No'}</Badge></div>
                  </>
                ) : <p className="text-xs text-muted-foreground">No buyer details submitted yet.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Queue row (collapsible) ───────────────────────────────────────────────────

function QueueRow({ item, allChats }: { item: QueueItem; allChats: AdminChat[] }) {
  const [open, setOpen] = React.useState(false);
  const action = primaryAction(item.nextActions);

  return (
    <div className={`rounded-xl border transition-shadow ${open ? 'shadow-md' : 'hover:shadow-sm'}`}>
      {/* Summary row */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors rounded-xl">
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">{item.id.slice(0,8)}</span>
            <Badge variant={dealStatusVariant(item.status)} className="text-[10px]">{dealStatusLabel(item.status)}</Badge>
          </div>
          <div className="text-sm font-semibold">{fmtCents(item.dealAmountCents)} <span className="font-normal text-muted-foreground text-xs">{item.coin}</span></div>
          <div className="flex items-center gap-1.5">
            {item.riskScore !== null && (
              <Badge variant={item.riskScore >= 50 ? 'warning' : 'secondary'} className="text-[10px]">Risk {item.riskScore}</Badge>
            )}
            {item.waitingOnMiddleman && <Badge variant="destructive" className="text-[10px]">⚡ Act now</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">{action?.label ?? '—'}</div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && <ExpandedDealPanel item={item} allChats={allChats} />}
    </div>
  );
}

// ── Quick nav ─────────────────────────────────────────────────────────────────

const NAV_CARDS = [
  { href: '/admin/users', icon: Users, label: 'Users', desc: 'Search, block, label accounts' },
  { href: '/admin/disputes', icon: Gavel, label: 'Disputes', desc: 'All open cases' },
  { href: '/admin/chats', icon: MessageCircle, label: 'Chat moderation', desc: 'Monitor & delete chats' },
  { href: '/admin/reviews', icon: FileText, label: 'Reviews', desc: 'Moderate public + deal reviews' },
  { href: '/admin/support', icon: TicketIcon, label: 'Support & Feedback', desc: 'User tickets & help requests' },
  { href: '/admin/operations', icon: BarChart3, label: 'Operations', desc: 'Analytics & circuit breakers' },
  { href: '/treasury', icon: DollarSign, label: 'Treasury', desc: 'On-chain reconciliation' },
];

// ── Disputes table ────────────────────────────────────────────────────────────

function DisputesSection({ disputes }: { disputes: AdminDispute[] }) {
  if (disputes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-8 text-center">
        <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
        <p className="text-sm font-medium">No open disputes</p>
        <p className="text-xs text-muted-foreground mt-1">All cases are resolved.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {disputes.map(d => (
        <div key={d.id} className="flex items-center justify-between gap-4 rounded-xl border bg-amber-500/5 border-amber-500/20 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Deal <span className="font-mono">{d.dealId.slice(0,8)}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">{d.coin} · {d.network}</Badge>
              </p>
              <p className="text-xs text-muted-foreground truncate">{d.reason ?? 'No reason provided'} · Opened {fmtDateShort(d.createdAt)}</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-500/40 text-amber-600">
            <Link href={`/admin/disputes/${d.dealId}`}><Gavel className="h-3.5 w-3.5 mr-1.5" />Review</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminConsolePage() {
  const router = useRouter();
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/admin');
  }, [status, router]);

  const queueQ = useQueue(status === 'authenticated');
  const disputesQ = useDisputes(status === 'authenticated');
  const chatsQ = useAdminChats(status === 'authenticated');
  const supportQ = useSupportStats(status === 'authenticated');

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const summary = queueQ.data?.summary;
  const items = queueQ.data?.items ?? [];
  const disputes = disputesQ.data ?? [];
  const allChats = chatsQ.data ?? [];

  // Sort: waiting-on-middleman first, then by risk score desc
  const sortedItems = [...items].sort((a, b) => {
    if (a.waitingOnMiddleman !== b.waitingOnMiddleman) return a.waitingOnMiddleman ? -1 : 1;
    return (b.riskScore ?? 0) - (a.riskScore ?? 0);
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Middleman Console</h1>
        <p className="text-sm text-muted-foreground">Full control over all deals, chats, users, and platform operations.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { label: 'Assigned', value: summary?.total ?? '—', icon: Layers, color: 'text-primary' },
          { label: 'Needs you', value: summary?.waiting ?? '—', icon: Clock, color: 'text-amber-500' },
          { label: 'On hold', value: summary?.onHold ?? '—', icon: Shield, color: 'text-blue-500' },
          { label: 'Disputes', value: disputes.length, icon: AlertTriangle, color: 'text-destructive' },
          { label: 'Open support tickets', value: supportQ.data?.open ?? '—', icon: TicketIcon, color: supportQ.data?.urgent ? 'text-destructive' : 'text-violet-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Support inbox alert — only when urgent/unread tickets */}
      {(supportQ.data?.urgent ?? 0) > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-sm font-medium text-destructive">
              {supportQ.data!.urgent} urgent support ticket{supportQ.data!.urgent > 1 ? 's' : ''} need your attention
            </p>
          </div>
          <Button asChild size="sm" variant="destructive" className="shrink-0">
            <Link href="/admin/support">View support inbox</Link>
          </Button>
        </div>
      )}

      {/* Quick nav */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Platform controls</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {NAV_CARDS.map(n => (
            <Link key={n.href} href={n.href}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card/80 hover:bg-card hover:shadow-sm px-3 py-3 text-center transition-all">
              <n.icon className="h-5 w-5 text-primary" />
              <p className="text-xs font-semibold">{n.label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Work queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Work queue</h2>
            <p className="text-xs text-muted-foreground">Click any deal to see full details, chats, and actions.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => { void queueQ.refetch(); void chatsQ.refetch(); }}>
            Refresh
          </Button>
        </div>
        {queueQ.isLoading ? (
          <div className="space-y-2">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        ) : queueQ.isError ? (
          <p className="text-sm text-destructive rounded-xl border border-destructive/20 px-4 py-3">Unable to load queue. You may not have middleman access.</p>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-10 text-center">
            <ListChecks className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">No deals assigned to you</p>
            <p className="text-xs text-muted-foreground mt-1">New deals will appear here when assigned.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedItems.map(item => (
              <QueueRow key={item.id} item={item} allChats={allChats} />
            ))}
          </div>
        )}
      </div>

      {/* Disputes */}
      <div className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Open disputes</h2>
          <p className="text-xs text-muted-foreground">Read both sides before issuing a decision.</p>
        </div>
        {disputesQ.isLoading ? <Skeleton className="h-24 w-full rounded-xl" /> : <DisputesSection disputes={disputes} />}
      </div>
    </div>
  );
}
