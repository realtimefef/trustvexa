'use client';
/**
 * Middleman Dashboard — full operator management console.
 *
 * Tabs:
 *  1. Overview   — stats + analytics
 *  2. Deals      — all assigned deals, view/edit/note/chat
 *  3. Chat Hub   — all deal chats across assigned deals (buy↔sell observer + private lanes)
 *  4. Disputes   — resolve open disputes
 *  5. Users      — search & enforce (block/label)
 *  6. Holds      — active holds management
 *  7. Connections — pre-deal chats
 *  8. Settings   — feature flags, pauses, announcements
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, BarChart3, Bell, CheckCircle2, Clock, Edit3,
  Eye, Flag, Gavel, Handshake, Lock, MessageCircle,
  RefreshCw, Send, Shield, ShieldAlert, ShieldOff, Star,
  ToggleLeft, ToggleRight, UserX, Users, X, Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatCard } from '@/components/visual/stat-card';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type {
  AdminDisputesResponse, DashboardResponse, DealSummary,
  MiddlemanQueueResponse,
} from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmt = (c: string | null) => { const n = Number(c); return c && Number.isFinite(n) ? formatUsdCents(n) : '—'; };
const fmtShort = (v: string | null) => { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); };

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserRow { id: string; username: string; email: string; accountType: string; accountStatus: string; accountLabel: string | null; createdAt: string; }
interface HoldRow { id: string; dealId: string; holdType: string; reason: string; createdAt: string; }
interface FeatureFlag { key: string; isEnabled: boolean; description: string | null; }
interface PauseRow { id: string; scope: string; reason: string; startedAt: string; endedAt: string | null; }
interface ChatRow { id: string; dealId: string; type: string; status: string; buyerId: string | null; sellerId: string | null; middlemanId: string | null; }
interface ChatMsg { id: string; senderId: string | null; body: string | null; isEdited: boolean; deletedForUsers: boolean; createdAt: string; }
interface ConnRow { id: string; code: string; creatorId: string; joinerId: string | null; middlemanId: string | null; creatorUsername: string | null; joinerUsername: string | null; dealId: string | null; status: string; joined: boolean; }

// ── Hooks ─────────────────────────────────────────────────────────────────────
const useQueue = (on: boolean) => useQuery({ queryKey: ['mm-queue'], enabled: on, refetchInterval: 60_000,
  queryFn: () => apiRequest<MiddlemanQueueResponse>('/admin/queue') });
const useDisputes = (on: boolean) => useQuery({ queryKey: ['mm-disputes'], enabled: on, refetchInterval: 60_000,
  queryFn: async () => (await apiRequest<AdminDisputesResponse>('/admin/disputes')).disputes });
const useDeals = (on: boolean) => useQuery({ queryKey: ['mm-deals'], enabled: on,
  queryFn: async () => (await apiRequest<DashboardResponse>('/dashboard')).deals });
const useConnections = (on: boolean) => useQuery({ queryKey: ['connections'], enabled: on,
  queryFn: async () => (await apiRequest<{ connections: ConnRow[] }>('/connections')).connections });
const useAnalytics = (on: boolean) => useQuery({ queryKey: ['mm-analytics'], enabled: on,
  queryFn: async () => {
    try {
      const res = await apiRequest<{
        analytics: {
          total_deals?: number;
          active_deals?: number;
          completed_deals?: number;
          disputed_deals?: number;
        } | null;
        fraudAnalytics: { blocked_user_count?: number } | null;
      }>('/admin/analytics');
      // Normalize to the shape the UI expects
      return {
        totalDeals: res.analytics?.total_deals ?? res.analytics?.active_deals ?? 0,
        resolvedDisputes: res.analytics?.completed_deals ?? 0,
        avgResolutionDays: null as number | null,
      };
    } catch { return null; }
  } });
const useUsers = (q: string, on: boolean) => useQuery({ queryKey: ['mm-users', q], enabled: on,
  queryFn: async () => { try { return (await apiRequest<{ users: UserRow[] }>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)).users; } catch { return [] as UserRow[]; } } });
const useHolds = (on: boolean) => useQuery({ queryKey: ['mm-holds'], enabled: on,
  queryFn: async () => { try { return (await apiRequest<{ holds: HoldRow[] }>('/admin/holds')).holds; } catch { return [] as HoldRow[]; } } });
const useFlags = (on: boolean) => useQuery({ queryKey: ['mm-flags'], enabled: on,
  queryFn: async () => { try { return (await apiRequest<{ flags: FeatureFlag[] }>('/admin/feature-flags')).flags; } catch { return [] as FeatureFlag[]; } } });
const usePauses = (on: boolean) => useQuery({ queryKey: ['mm-pauses'], enabled: on,
  queryFn: async () => { try { return (await apiRequest<{ pauses: PauseRow[] }>('/admin/pause')).pauses; } catch { return [] as PauseRow[]; } } });
const useAllChats = (on: boolean) => useQuery({ queryKey: ['mm-all-chats'], enabled: on,
  queryFn: async () => { try { return (await apiRequest<{ chats: ChatRow[] }>('/chats')).chats; } catch { return [] as ChatRow[]; } } });
const useChatMsgs = (id: string | null) => useQuery({ queryKey: ['mm-chat-msgs', id], enabled: !!id, refetchInterval: 15_000,
  queryFn: async () => { try { return (await apiRequest<{ messages: ChatMsg[] }>(`/chats/${id}/messages?limit=100`)).messages; } catch { return [] as ChatMsg[]; } } });

// ── Chat Viewer Modal ─────────────────────────────────────────────────────────
function ChatViewerModal({ dealId, dealLabel, onClose, myUserId, dealMmId }: { dealId: string; dealLabel: string; onClose: () => void; myUserId: string; dealMmId: string | null; }) {
  const qc = useQueryClient();
  const [activeChat, setActiveChat] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  const allChatsQ = useAllChats(true);
  const dealChats = (allChatsQ.data ?? []).filter(c => c.dealId === dealId);
  const msgsQ = useChatMsgs(activeChat);
  const msgs = msgsQ.data ?? [];

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const LABELS: Record<string, string> = { buyer_seller: '👥 Buyer ↔ Seller (observer)', buyer_mm: '🔵 Buyer ↔ You', seller_mm: '🟢 Seller ↔ You', handover_mm: '📦 Handover ↔ You' };
  const canPost = (type: string) => type !== 'buyer_seller' && dealMmId === myUserId;
  const activeType = dealChats.find(c => c.id === activeChat)?.type ?? '';
  const activeChatStatus = dealChats.find(c => c.id === activeChat)?.status ?? '';

  const sendMsg = async () => {
    if (!activeChat || !draft.trim()) return;
    setSending(true);
    try {
      await apiRequest(`/chats/${activeChat}/messages`, { method: 'POST', body: { body: draft.trim() }, idempotencyKey: newIdempotencyKey() });
      setDraft('');
      void qc.invalidateQueries({ queryKey: ['mm-chat-msgs', activeChat] });
    } catch { /* noop */ } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-6 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl border bg-card shadow-glow flex flex-col" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0">
          <div>
            <h3 className="font-display text-sm font-bold">Chats — Deal <span className="font-mono">{dealLabel}</span></h3>
            <p className="text-[10px] text-muted-foreground">You observe buyer↔seller and participate in your private channels.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Channel list */}
          <div className="w-48 shrink-0 border-r p-2 flex flex-col gap-1">
            {dealChats.length === 0 ? <p className="text-[10px] text-muted-foreground p-2">No chats yet.</p> :
              dealChats.map(c => (
                <button key={c.id} onClick={() => setActiveChat(c.id)}
                  className={`text-left rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${activeChat === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}>
                  {LABELS[c.type] ?? c.type}
                  {c.status === 'closed' && <span className="block text-[9px] text-muted-foreground">closed</span>}
                </button>
              ))}
          </div>
          {/* Messages */}
          <div className="flex flex-1 flex-col min-h-0">
            {!activeChat ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">← Select a channel</div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  {msgsQ.isLoading ? <Skeleton className="h-12 w-full" /> :
                   msgs.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No messages yet.</p> :
                   <div className="flex flex-col gap-1">
                     {msgs.map(m => {
                       const mine = m.senderId === myUserId;
                       return (
                         <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                           {!mine && <span className="text-[9px] text-muted-foreground ml-1 mb-0.5 leading-none">{m.senderId?.slice(0, 8) ?? 'System'}</span>}
                           <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-xs leading-normal break-words ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted border'} ${m.deletedForUsers ? 'opacity-40 italic' : ''}`}>
                             {m.deletedForUsers ? 'Message deleted' : (m.body ?? '—')}
                           </div>
                           <span className={`text-[9px] text-muted-foreground mt-0.5 leading-none ${mine ? 'mr-1' : 'ml-1'}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                       );
                     })}
                   </div>}
                  <div ref={endRef} />
                </div>
                {canPost(activeType) && activeChatStatus !== 'closed' ? (
                  <div className="px-4 pb-3 flex gap-2 items-center shrink-0 border-t pt-3">
                    <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Type a message to buyer or seller…" className="text-xs h-8 flex-1"
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMsg(); } }} />
                    <Button size="icon" variant="gradient" className="h-8 w-8 shrink-0" disabled={!draft.trim() || sending} onClick={() => void sendMsg()}><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : activeType === 'buyer_seller' ? (
                  <p className="px-4 pb-3 pt-2 text-[10px] text-amber-600 border-t shrink-0">🔍 Observer: you can read buyer↔seller messages but cannot post here.</p>
                ) : !canPost(activeType) ? (
                  <p className="px-4 pb-3 pt-2 text-[10px] text-muted-foreground border-t shrink-0">You are not assigned as middleman on this deal.</p>
                ) : (
                  <p className="px-4 pb-3 pt-2 text-[10px] text-muted-foreground border-t shrink-0">Chat is closed.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Deal Edit Modal ───────────────────────────────────────────────────────────
function DealEditModal({ deal, onClose }: { deal: DealSummary; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/notes/deal/${deal.id}`, { method: 'POST', body: { note: note.trim() }, idempotencyKey: newIdempotencyKey() });
      setNote(''); setMsg('✓ Note saved');
      void qc.invalidateQueries({ queryKey: ['mm-deals'] });
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-glow space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm">Deal <span className="font-mono">{deal.id.slice(0, 8)}</span></h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><p className="text-muted-foreground text-[10px]">Status</p><Badge variant={dealStatusVariant(deal.status)} className="mt-0.5">{dealStatusLabel(deal.status)}</Badge></div>
          <div><p className="text-muted-foreground text-[10px]">Amount</p><p className="font-medium">{fmt(deal.dealAmountCents)}</p></div>
          <div><p className="text-muted-foreground text-[10px]">Coin / Network</p><p className="font-mono">{deal.coin}/{deal.network}</p></div>
          <div><p className="text-muted-foreground text-[10px]">Created</p><p>{fmtShort(deal.createdAt)}</p></div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Add internal note</Label>
          <div className="flex gap-2">
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note about this deal…" className="text-xs h-8 flex-1" />
            <Button size="sm" variant="outline" disabled={saving || !note.trim()} onClick={() => void saveNote()}>{saving ? '…' : 'Save'}</Button>
          </div>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Button asChild variant="gradient" size="sm"><Link href={`/deals/${deal.id}`}>Full deal page <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'deals' | 'chathub' | 'disputes' | 'users' | 'holds' | 'connections' | 'settings';

export default function MiddlemanDashboardPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const qc = useQueryClient();

  React.useEffect(() => {
    if (status === 'anonymous') { router.replace('/login?next=/middleman'); return; }
    if (status === 'authenticated' && user?.role !== 'middleman') router.replace('/dashboard');
  }, [status, user, router]);

  const isReady = status === 'authenticated' && user?.role === 'middleman';
  const [tab, setTab] = React.useState<Tab>('overview');
  const [editDeal, setEditDeal] = React.useState<DealSummary | null>(null);
  const [chatDeal, setChatDeal] = React.useState<DealSummary | null>(null);
  const [userSearch, setUserSearch] = React.useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = React.useState('');
  const [pauseScope, setPauseScope] = React.useState('new_deals');
  const [pauseReason, setPauseReason] = React.useState('');
  const [annTitle, setAnnTitle] = React.useState('');
  const [annBody, setAnnBody] = React.useState('');
  const [annAudience, setAnnAudience] = React.useState<'all' | 'user' | 'middleman'>('all');
  const [submitting, setSubmitting] = React.useState(false);
  const [actionMsg, setActionMsg] = React.useState<string | null>(null);

  React.useEffect(() => { const t = setTimeout(() => setDebouncedUserSearch(userSearch), 500); return () => clearTimeout(t); }, [userSearch]);

  const queueQ = useQueue(isReady);
  const disputesQ = useDisputes(isReady);
  const dealsQ = useDeals(isReady);
  const connectionsQ = useConnections(isReady);
  const analyticsQ = useAnalytics(isReady);
  const usersQ = useUsers(debouncedUserSearch, isReady && tab === 'users');
  const holdsQ = useHolds(isReady && tab === 'holds');
  const flagsQ = useFlags(isReady && tab === 'settings');
  const pausesQ = usePauses(isReady && tab === 'settings');

  if (!isReady) return <div className="mx-auto max-w-6xl space-y-4"><Skeleton className="h-32 rounded-3xl" /><div className="grid gap-4 sm:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div></div>;

  const queue = queueQ.data;
  const queueItems = queue?.items ?? [];
  const disputes = disputesQ.data ?? [];
  const allDeals = dealsQ.data ?? [];
  const mmDeals = allDeals.filter(d => d.role === 'middleman');
  const connections = connectionsQ.data ?? [];
  const myConns = connections.filter(c => c.middlemanId === user?.id);
  const openDisputes = disputes.filter(d => ['open', 'under_review'].includes(d.status));

  const TABS: Array<{ key: Tab; label: string; icon: React.ElementType; count?: number }> = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'deals', label: 'Deals', icon: Star, count: queueItems.filter(i => i.waitingOnMiddleman).length },
    { key: 'chathub', label: 'Chat Hub', icon: MessageCircle },
    { key: 'disputes', label: 'Disputes', icon: Gavel, count: openDisputes.length },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'holds', label: 'Holds', icon: Lock },
    { key: 'connections', label: 'Connections', icon: Handshake, count: myConns.filter(c => c.status === 'open').length },
    { key: 'settings', label: 'Settings', icon: Zap },
  ];

  const doAction = async (fn: () => Promise<void>, successMsg: string) => {
    setSubmitting(true); setActionMsg(null);
    try { await fn(); setActionMsg(successMsg); void qc.invalidateQueries(); }
    catch (e) { setActionMsg('Error: ' + (e instanceof Error ? e.message : 'Failed')); }
    finally { setSubmitting(false); }
  };

  const toggleFlag = (key: string, cur: boolean) =>
    doAction(() => apiRequest(`/admin/feature-flags/${key}`, { method: 'PATCH', body: { isEnabled: !cur, reason: 'Toggled via dashboard' }, idempotencyKey: newIdempotencyKey() }), `Flag ${key} ${!cur ? 'enabled' : 'disabled'}`);

  const startPause = () =>
    doAction(() => apiRequest('/admin/pause', { method: 'POST', body: { scope: pauseScope, reason: pauseReason }, idempotencyKey: newIdempotencyKey() }), 'Pause started');

  const endPause = (id: string) =>
    doAction(() => apiRequest(`/admin/pause/${id}`, { method: 'DELETE' }), 'Pause ended');

  const sendAnnouncement = () =>
    doAction(() => apiRequest('/admin/announcements', { method: 'POST', body: { title: annTitle, body: annBody, audience: annAudience }, idempotencyKey: newIdempotencyKey() }), 'Announcement sent!');

  const blockUser = (uid: string, reason: string) =>
    doAction(() => apiRequest(`/admin/users/${uid}/block`, { method: 'PATCH', body: { reason }, idempotencyKey: newIdempotencyKey() }), 'User blocked');

  const releaseHold = (holdId: string) =>
    doAction(() => apiRequest(`/admin/holds/${holdId}/release`, { method: 'POST', body: { reason: 'Released via dashboard' }, idempotencyKey: newIdempotencyKey() }), 'Hold released');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border bg-brand-gradient p-7 text-white shadow-glow-lg">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">⚖️ Middleman Console</h1>
            <p className="mt-1 text-sm text-white/80">Welcome, {user?.username}. Full control — deals, chats, disputes, users, settings.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90"><Link href="/connect"><Handshake className="h-4 w-4 mr-1" /> Connections</Link></Button>
            <Button asChild size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20"><Link href="/disputes"><Gavel className="h-4 w-4 mr-1" /> Disputes</Link></Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Shield} label="Queue" value={queue?.summary?.total ?? mmDeals.length} accent="primary" />
        <StatCard icon={Clock} label="Your move" value={queueItems.filter(i => i.waitingOnMiddleman).length} accent={queueItems.some(i => i.waitingOnMiddleman) ? 'warning' : 'success'} />
        <StatCard icon={ShieldAlert} label="Open disputes" value={openDisputes.length} accent={openDisputes.length > 0 ? 'warning' : 'success'} />
        <StatCard icon={Users} label="Connections" value={myConns.filter(c => c.status === 'open').length} accent="accent" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-muted/40 p-1 border w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-3 w-3" />
            {t.label}
            {t.count != null && t.count > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">{t.count}</span>}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {analyticsQ.data && (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: BarChart3, v: analyticsQ.data.totalDeals, label: 'Total deals handled', cls: 'text-primary bg-primary/10' },
                { icon: CheckCircle2, v: analyticsQ.data.resolvedDisputes, label: 'Disputes resolved', cls: 'text-emerald-600 bg-emerald-500/10' },
                { icon: Clock, v: analyticsQ.data.avgResolutionDays != null ? `${analyticsQ.data.avgResolutionDays.toFixed(1)}d` : '—', label: 'Avg resolution', cls: 'text-amber-600 bg-amber-500/10' },
              ].map((s, i) => (
                <Card key={i} className="rounded-2xl shadow-soft">
                  <CardContent className="pt-5 flex items-center gap-4">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.cls}`}><s.icon className="h-5 w-5" /></span>
                    <div><p className="text-2xl font-bold">{String(s.v)}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <Card className="rounded-2xl shadow-soft">
            <CardHeader><CardTitle className="text-sm">Quick actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { href: '/connect', icon: Handshake, label: 'Connect & Chat', desc: 'Pre-deal conversations' },
                  { href: '/disputes', icon: Gavel, label: 'All Disputes', desc: 'Platform dispute view' },
                  { href: '/reviews', icon: Star, label: 'Reviews', desc: 'Moderate public reviews' },
                ].map(a => (
                  <Link key={a.href} href={a.href} className="group flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-brand-gradient group-hover:text-white transition-colors"><a.icon className="h-4 w-4" /></span>
                    <div><p className="font-medium text-sm">{a.label}</p><p className="text-xs text-muted-foreground">{a.desc}</p></div>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── DEALS ── */}
      {tab === 'deals' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Assigned Deals</CardTitle><CardDescription>Every deal you are middleman on. Edit, add notes, open chats.</CardDescription></div>
              <Button variant="ghost" size="sm" onClick={() => void dealsQ.refetch()}><RefreshCw className={`h-3.5 w-3.5 ${dealsQ.isFetching ? 'animate-spin' : ''}`} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {dealsQ.isLoading ? <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
             mmDeals.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No deals assigned yet.</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal ID</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead>
                    <TableHead>Coin</TableHead><TableHead>Action?</TableHead><TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mmDeals.map(d => {
                    const waiting = queueItems.find(q => q.id === d.id)?.waitingOnMiddleman;
                    return (
                      <TableRow key={d.id} className={waiting ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}>
                        <TableCell className="font-mono text-xs">{d.id.slice(0, 8)}{waiting && <Badge variant="warning" className="ml-1 text-[9px] px-1">Your move</Badge>}</TableCell>
                        <TableCell><Badge variant={dealStatusVariant(d.status)}>{dealStatusLabel(d.status)}</Badge></TableCell>
                        <TableCell className="text-xs">{fmt(d.dealAmountCents)}</TableCell>
                        <TableCell className="text-xs font-mono">{d.coin}/{d.network}</TableCell>
                        <TableCell className="text-xs">{waiting ? <span className="text-amber-600 font-medium">Yes</span> : '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtShort(d.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setChatDeal(d)}><MessageCircle className="h-3 w-3 mr-1" />Chats</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setEditDeal(d)}><Edit3 className="h-3 w-3 mr-1" />Edit</Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[10px]"><Link href={`/deals/${d.id}`}><Eye className="h-3 w-3 mr-1" />View</Link></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CHAT HUB ── */}
      {tab === 'chathub' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Chat Hub</CardTitle>
            <CardDescription>Click "Open Chats" on any deal to view buyer↔seller conversation and chat privately with each party.</CardDescription>
          </CardHeader>
          <CardContent>
            {mmDeals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No deals assigned. Chats appear once you are assigned to a deal.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mmDeals.map(d => (
                  <div key={d.id} className="rounded-xl border p-3 space-y-2 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{d.id.slice(0, 8)}</span>
                      <Badge variant={dealStatusVariant(d.status)} className="text-[9px]">{dealStatusLabel(d.status)}</Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.coin}/{d.network} · {fmt(d.dealAmountCents)}</div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="gradient" className="flex-1 h-7 text-[10px]" onClick={() => setChatDeal(d)}>
                        <MessageCircle className="h-3 w-3 mr-1" /> Open Chats
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-[10px] px-2">
                        <Link href={`/deals/${d.id}`}><Eye className="h-3 w-3" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DISPUTES ── */}
      {tab === 'disputes' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Gavel className="h-4 w-4 text-destructive" /> Disputes</CardTitle><CardDescription>Mediate and resolve open disputes.</CardDescription></div>
              <Button variant="ghost" size="sm" onClick={() => void disputesQ.refetch()}><RefreshCw className={`h-3.5 w-3.5 ${disputesQ.isFetching ? 'animate-spin' : ''}`} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {disputesQ.isLoading ? <Skeleton className="h-24 w-full" /> :
             disputes.length === 0 ? <div className="flex flex-col items-center gap-2 py-10"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="text-sm text-muted-foreground">No open disputes!</p></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Dispute</TableHead><TableHead>Deal</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead>Coin</TableHead><TableHead>Opened</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {disputes.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs"><Link href={`/deals/${d.dealId}`} className="hover:underline text-primary">{d.dealId.slice(0, 8)}</Link></TableCell>
                      <TableCell className="text-xs max-w-[10rem] truncate">{d.reason ?? '—'}</TableCell>
                      <TableCell><Badge variant={d.status === 'open' ? 'warning' : 'secondary'}>{d.status}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{d.coin}/{d.network}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtShort(d.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => { const deal = allDeals.find(dd => dd.id === d.dealId); if (deal) setChatDeal(deal); }}><MessageCircle className="h-3 w-3 mr-1" />Chats</Button>
                          <Button asChild size="sm" variant="gradient" className="h-7 px-2 text-[10px]"><Link href={`/deals/${d.dealId}`}>Resolve</Link></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── USERS ── */}
      {tab === 'users' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> User Management</CardTitle>
            <CardDescription>Search users and take enforcement actions (block, label).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by username or email…" className="text-xs h-8 max-w-sm" />
            {usersQ.isLoading ? <Skeleton className="h-24 w-full" /> :
             (usersQ.data ?? []).length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No users found.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Account type</TableHead><TableHead>Status</TableHead><TableHead>Label</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(usersQ.data ?? []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-medium">{u.username}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{u.accountType}</Badge></TableCell>
                      <TableCell><Badge variant={u.accountStatus === 'active' ? 'success' : 'warning'} className="text-[9px]">{u.accountStatus}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.accountLabel ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtShort(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10" onClick={() => { const r = window.prompt('Reason for blocking?'); if (r) blockUser(u.id, r); }}>
                          <UserX className="h-3 w-3 mr-1" /> Block
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── HOLDS ── */}
      {tab === 'holds' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-500" /> Active Holds</CardTitle><CardDescription>Deals on manual review hold. Release when resolved.</CardDescription></div>
              <Button variant="ghost" size="sm" onClick={() => void holdsQ.refetch()}><RefreshCw className={`h-3.5 w-3.5 ${holdsQ.isFetching ? 'animate-spin' : ''}`} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {holdsQ.isLoading ? <Skeleton className="h-24 w-full" /> :
             (holdsQ.data ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No active holds.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Hold ID</TableHead><TableHead>Deal</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(holdsQ.data ?? []).map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-mono text-xs">{h.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs"><Link href={`/deals/${h.dealId}`} className="hover:underline text-primary">{h.dealId.slice(0, 8)}</Link></TableCell>
                      <TableCell><Badge variant="warning" className="text-[9px]">{h.holdType}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[12rem] truncate">{h.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtShort(h.createdAt)}</TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={submitting} onClick={() => releaseHold(h.id)}>Release</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CONNECTIONS ── */}
      {tab === 'connections' && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader><CardTitle className="flex items-center gap-2"><Handshake className="h-4 w-4 text-primary" /> My Connections</CardTitle><CardDescription>Pre-deal chats where you are assigned middleman.</CardDescription></CardHeader>
          <CardContent>
            {connectionsQ.isLoading ? <Skeleton className="h-24 w-full" /> :
             myConns.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No connections assigned yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Buyer</TableHead><TableHead>Seller</TableHead><TableHead>Deal</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Chat</TableHead></TableRow></TableHeader>
                <TableBody>
                  {myConns.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-bold text-xs tracking-widest">{c.code}</TableCell>
                      <TableCell className="text-xs">{c.creatorUsername ?? c.creatorId.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{c.joinerUsername ?? (c.joinerId ? c.joinerId.slice(0, 8) : '—')}</TableCell>
                      <TableCell className="text-xs font-mono">{c.dealId ? <Link href={`/deals/${c.dealId}`} className="hover:underline text-primary">{c.dealId.slice(0, 8)}</Link> : <span className="text-muted-foreground">No deal</span>}</TableCell>
                      <TableCell><Badge variant={c.status === 'open' ? (c.joined ? 'success' : 'warning') : 'secondary'}>{c.status === 'closed' ? 'Closed' : c.joined ? 'Active' : 'Waiting'}</Badge></TableCell>
                      <TableCell className="text-right"><Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[10px]"><Link href={`/connect?open=${c.id}`}>Open chat</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SETTINGS ── */}
      {tab === 'settings' && (
        <div className="space-y-4">
          {/* Feature flags */}
          <Card className="rounded-2xl shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2"><Flag className="h-4 w-4 text-primary" /> Feature Flags</CardTitle><CardDescription>Enable or disable platform features in real-time.</CardDescription></CardHeader>
            <CardContent>
              {flagsQ.isLoading ? <Skeleton className="h-16 w-full" /> :
               (flagsQ.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground py-4">No flags found.</p> : (
                <div className="divide-y">
                  {(flagsQ.data ?? []).map(f => (
                    <div key={f.key} className="flex items-center justify-between py-3">
                      <div><p className="font-mono text-xs font-medium">{f.key}</p>{f.description && <p className="text-[10px] text-muted-foreground">{f.description}</p>}</div>
                      <button disabled={submitting} onClick={() => void toggleFlag(f.key, f.isEnabled)} className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1 transition-colors ${f.isEnabled ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30' : 'text-muted-foreground bg-muted hover:bg-muted/80'}`}>
                        {f.isEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        {f.isEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency pause */}
          <Card className="rounded-2xl shadow-soft border-destructive/30">
            <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><ShieldOff className="h-4 w-4" /> Emergency Pause</CardTitle><CardDescription>Temporarily halt a platform function (e.g. new deals, payouts).</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {pausesQ.isLoading ? <Skeleton className="h-8 w-full" /> :
               (pausesQ.data ?? []).filter(p => !p.endedAt).length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                  <p className="text-xs font-semibold text-destructive">Active pauses:</p>
                  {(pausesQ.data ?? []).filter(p => !p.endedAt).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span><span className="font-mono">{p.scope}</span> — {p.reason.slice(0, 40)}</span>
                      <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10" disabled={submitting} onClick={() => endPause(p.id)}>End</Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Scope</Label>
                  <select value={pauseScope} onChange={e => setPauseScope(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs mt-1">
                    {['new_deals', 'deposits', 'payouts', 'withdrawals', 'signups', 'chain'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Reason</Label><Input value={pauseReason} onChange={e => setPauseReason(e.target.value)} placeholder="Why are you pausing this?" className="text-xs h-8 mt-1" /></div>
              </div>
              <Button variant="destructive" size="sm" disabled={submitting || !pauseReason.trim()} onClick={() => void startPause()}>Start Pause</Button>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="rounded-2xl shadow-soft">
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Send Announcement</CardTitle><CardDescription>Broadcast a message to all users, buyers/sellers, or middlemen.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <div><Label className="text-xs">Title</Label><Input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Announcement title" className="text-xs h-8 mt-1" /></div>
                <div><Label className="text-xs">Audience</Label>
                  <select value={annAudience} onChange={e => setAnnAudience(e.target.value as typeof annAudience)} className="w-full rounded-md border bg-background px-2 py-1.5 text-xs mt-1">
                    <option value="all">All users</option><option value="user">Buyers & Sellers</option><option value="middleman">Middlemen only</option>
                  </select>
                </div>
              </div>
              <div><Label className="text-xs">Message</Label><textarea value={annBody} onChange={e => setAnnBody(e.target.value)} placeholder="Announcement message…" className="w-full mt-1 rounded-md border bg-background px-3 py-2 text-xs h-20 resize-none focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <Button size="sm" variant="gradient" disabled={submitting || !annTitle.trim() || !annBody.trim()} onClick={() => void sendAnnouncement()}>
                <Bell className="h-3.5 w-3.5 mr-1" /> Send Announcement
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      {editDeal && <DealEditModal deal={editDeal} onClose={() => setEditDeal(null)} />}
      {chatDeal && (
        <ChatViewerModal
          dealId={chatDeal.id}
          dealLabel={chatDeal.id.slice(0, 8)}
          onClose={() => setChatDeal(null)}
          myUserId={user?.id ?? ''}
          dealMmId={null}
        />
      )}
    </div>
  );
}
