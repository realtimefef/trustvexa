'use client';
/**
 * Connect & Chat — full redesign.
 *
 * Layout: WhatsApp-style sidebar + main chat area.
 * Channels shown as tabs (Buyer↔Seller, Buyer↔MM, Seller↔MM).
 * Messages are grouped by sender within 5-minute windows.
 * Deal creation/link shown only for true buyer↔seller connections.
 */
import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy, FileText, ImagePlus, Link as LinkIcon,
  Loader2, LogIn, MessageSquare, Plus, Send,
  Shield, Trash2, X, LifeBuoy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiRequest, getAccessToken, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useSocket } from '@/lib/socket/socket-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = 'buyer_seller' | 'buyer_mm' | 'seller_mm';

interface ConnectionView {
  id: string;
  code: string;
  creatorId: string;
  joinerId: string | null;
  middlemanId: string | null;
  creatorUsername: string | null;
  joinerUsername: string | null;
  middlemanUsername: string | null;
  dealId: string | null;
  status: 'open' | 'closed';
  joined: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConnectionMessage {
  id: string;
  senderId: string;
  body: string;
  channel: string;
  deletedAt: string | null;
  createdAt: string;
  mine: boolean;
}

const IMG_PREFIX = '[img:';
const IMG_OLD_PREFIX = '[image:';

function extractFileKeyFromOldUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const marker = '/storage/files/';
    const idx = path.indexOf(marker);
    if (idx === -1) return null;
    const keyWithView = path.slice(idx + marker.length);
    return keyWithView.endsWith('/view') ? keyWithView.slice(0, -5) : keyWithView;
  } catch { return null; }
}

// ─── AuthImage ────────────────────────────────────────────────────────────────

function AuthImage({ fileKey }: { fileKey: string }) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let revoked = false;
    const src = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/storage/serve/${encodeURIComponent(fileKey)}`;
    const token = getAccessToken();
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((b) => { if (!revoked) setBlobUrl(URL.createObjectURL(b)); })
      .catch(() => { if (!revoked) setFailed(true); });
    return () => {
      revoked = true;
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [fileKey]);

  if (failed) return <span className="text-[11px] text-muted-foreground italic">Image unavailable</span>;
  if (!blobUrl) return <span className="inline-block h-12 w-36 rounded-xl bg-muted animate-pulse" />;
  return (
    <a href={blobUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] overflow-hidden rounded-xl border border-white/10 hover:opacity-90 transition-opacity">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blobUrl} alt="Image" className="h-auto w-full object-cover max-h-52" loading="lazy" />
    </a>
  );
}

// ─── MsgBody ──────────────────────────────────────────────────────────────────

function MsgBody({ body, deleted }: { body: string; deleted: boolean }) {
  if (deleted) return <em className="text-[11px] opacity-60">Message deleted</em>;
  if (body.startsWith(IMG_PREFIX)) return <AuthImage fileKey={body.slice(IMG_PREFIX.length, -1)} />;
  if (body.startsWith(IMG_OLD_PREFIX)) {
    const rawUrl = body.slice(IMG_OLD_PREFIX.length, -1);
    const fk = extractFileKeyFromOldUrl(rawUrl);
    if (fk) return <AuthImage fileKey={fk} />;
    return <span className="text-[11px] italic opacity-60">🖼 Image</span>;
  }
  // FIX: whitespace-pre-wrap renders newlines correctly instead of collapsing them
  return <span className="whitespace-pre-wrap break-words leading-snug">{body}</span>;
}

// ─── Message grouping helper ──────────────────────────────────────────────────

interface MessageGroup {
  senderId: string;
  senderLabel: string;
  isMine: boolean;
  isSystem: boolean;
  messages: ConnectionMessage[];
}

function groupMessages(
  messages: ConnectionMessage[],
  myUserId: string | undefined,
  labelFn: (id: string) => string,
): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const isMine = myUserId ? m.senderId === myUserId : m.mine;
    const isSystem = m.senderId === 'system';
    const last = groups[groups.length - 1];
    const prevTime = last?.messages[last.messages.length - 1]?.createdAt;
    const sameWindow = last && last.senderId === m.senderId &&
      (!prevTime || (new Date(m.createdAt).getTime() - new Date(prevTime).getTime() < 5 * 60 * 1000));
    if (sameWindow && last) {
      last.messages.push(m);
    } else {
      groups.push({ senderId: m.senderId, senderLabel: labelFn(m.senderId), isMine, isSystem, messages: [m] });
    }
  }
  return groups;
}

// ─── Channel colors ───────────────────────────────────────────────────────────

const CHANNEL_META: Record<Channel, { label: string; color: string; tabColor: string }> = {
  buyer_seller: { label: 'Buyer ↔ Seller', color: 'text-blue-400', tabColor: 'border-blue-500 text-blue-600 dark:text-blue-400' },
  buyer_mm:     { label: 'Buyer ↔ Middleman', color: 'text-violet-400', tabColor: 'border-violet-500 text-violet-600 dark:text-violet-400' },
  seller_mm:    { label: 'Seller ↔ Middleman', color: 'text-emerald-400', tabColor: 'border-emerald-500 text-emerald-600 dark:text-emerald-400' },
};

// ─── Chat panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  channel: Channel;
  messages: ConnectionMessage[];
  isLoading: boolean;
  canSend: boolean;
  isClosed: boolean;
  myUserId: string | undefined;
  senderLabel: (id: string) => string;
  onSend: (body: string, channel: Channel) => Promise<void>;
  onSendImage: (file: File, channel: Channel) => Promise<void>;
  onDelete: (msgId: string) => void;
  uploading: boolean;
}

function ChatPanel({ channel, messages, isLoading, canSend, isClosed, myUserId, senderLabel, onSend, onSendImage, onDelete, uploading }: ChatPanelProps) {
  const [draft, setDraft] = React.useState('');
  const endRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const visible = messages.filter((m) => m.channel === channel);
  const groups = groupMessages(visible, myUserId, senderLabel);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visible.length]);

  const doSend = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    await onSend(t, channel);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-0">
        {isLoading ? (
          <div className="space-y-3 pt-4">
            <Skeleton className="h-8 w-48 rounded-2xl" />
            <Skeleton className="h-8 w-36 rounded-2xl ml-auto" />
            <Skeleton className="h-8 w-56 rounded-2xl" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {canSend ? 'No messages yet. Start the conversation.' : 'Waiting for the other party to join.'}
            </p>
          </div>
        ) : (
          groups.map((group, gi) => (
            <div key={gi} className={`flex flex-col gap-0.5 ${group.isMine ? 'items-end' : group.isSystem ? 'items-center' : 'items-start'}`}>
              {/* Sender label (only at top of group, for non-mine, non-system) */}
              {!group.isMine && !group.isSystem && (
                <span className="text-[10px] font-semibold text-muted-foreground px-1 mb-0.5">{group.senderLabel}</span>
              )}
              {group.messages.map((m, mi) => {
                const deleted = !!m.deletedAt;
                const isLast = mi === group.messages.length - 1;
                return (
                  <div key={m.id} className={`group flex items-end gap-1.5 max-w-[75%] ${group.isMine ? 'flex-row-reverse' : ''} ${group.isSystem ? 'max-w-full w-full justify-center' : ''}`}>
                    {/* Delete button on hover for own messages */}
                    {group.isMine && !deleted && (
                      <button type="button" onClick={() => onDelete(m.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <div className="flex flex-col">
                      <div className={`px-3 py-2 text-sm ${
                        group.isSystem
                          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-center text-xs px-4'
                          : group.isMine
                            ? `bg-primary text-primary-foreground ${mi === 0 ? 'rounded-t-2xl' : 'rounded-t-md'} rounded-bl-2xl ${isLast ? 'rounded-br-sm' : 'rounded-br-2xl'}`
                            : `bg-muted border border-border/40 ${mi === 0 ? 'rounded-t-2xl' : 'rounded-t-md'} rounded-br-2xl ${isLast ? 'rounded-bl-sm' : 'rounded-bl-2xl'}`
                      } ${deleted ? 'opacity-40' : ''}`}>
                        <MsgBody body={m.body} deleted={deleted} />
                      </div>
                      {/* Timestamp on last message of group */}
                      {isLast && (
                        <span className={`text-[10px] text-muted-foreground mt-0.5 ${group.isMine ? 'text-right' : 'text-left'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      {!isClosed && canSend ? (
        <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm px-4 py-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void onSendImage(f, channel); }} />
          <div className="flex items-end gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </button>
            <div className="flex-1 relative">
              <textarea value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                rows={1}
                className="w-full resize-none rounded-xl border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[36px] max-h-32 overflow-y-auto"
                style={{ height: Math.min(128, Math.max(36, (draft.split('\n').length) * 22)) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void doSend(); } }} />
            </div>
            <button type="button" disabled={!draft.trim()}
              onClick={() => void doSend()}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 ml-1">Enter to send · Shift+Enter for new line</p>
        </div>
      ) : isClosed ? (
        <div className="shrink-0 border-t px-4 py-3 text-center text-xs text-muted-foreground italic">
          This conversation is closed.
        </div>
      ) : (
        <div className="shrink-0 border-t px-4 py-3 text-center text-xs text-muted-foreground italic">
          Waiting for the other party to join before you can chat.
        </div>
      )}
    </div>
  );
}

// ─── Connection list item ─────────────────────────────────────────────────────

function ConnItem({ c, active, onClick }: { c: ConnectionView; active: boolean; onClick: () => void }) {
  const isLive = c.status === 'open' && c.joined;
  const isWaiting = c.status === 'open' && !c.joined;
  const isClosed = c.status === 'closed';

  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
        active ? 'bg-primary/8 border-l-primary' : 'border-l-transparent hover:bg-muted/50'
      } ${isClosed ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="font-mono text-xs font-bold tracking-widest">{c.code}</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
          isLive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : isWaiting ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          : 'bg-muted text-muted-foreground'
        }`}>
          {isLive ? '● live' : isWaiting ? '◌ waiting' : '✕ closed'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {c.creatorUsername ?? 'You'}{c.joinerUsername ? ` ↔ ${c.joinerUsername}` : ''}
      </p>
      <div className="flex gap-1 mt-1 flex-wrap">
        {c.middlemanId && (
          <span className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">⚖️ MM</span>
        )}
        {c.dealId && (
          <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">Deal {c.dealId.slice(0, 6)}</span>
        )}
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [joinCode, setJoinCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [activeChannel, setActiveChannel] = React.useState<Channel>('buyer_seller');
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const openId = p.get('open'); const joinParam = p.get('join');
    if (openId) setActiveId(openId);
    if (joinParam) setJoinCode(joinParam.toUpperCase());
  }, []);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const connections = useQuery({
    queryKey: ['connections'], enabled: status === 'authenticated',
    queryFn: async () => {
      const res = await apiRequest<{ connections: ConnectionView[] }>('/connections');
      return Array.isArray(res) ? res : (res.connections ?? []);
    },
    refetchInterval: 30_000,
  });

  const active = useQuery({
    queryKey: ['connection', activeId], enabled: activeId !== null && status === 'authenticated',
    queryFn: async () => apiRequest<ConnectionView>(`/connections/${activeId}`),
  });

  const messages = useQuery({
    queryKey: ['connection-messages', activeId],
    enabled: activeId !== null && status === 'authenticated',
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await apiRequest<{ messages: ConnectionMessage[] }>(`/connections/${activeId}/messages`);
      return res.messages ?? [];
    },
  });

  // ── Socket ────────────────────────────────────────────────────────────────────
  const { socket } = useSocket();
  React.useEffect(() => {
    if (!socket) return;
    const handler = (data: { connectionId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['connection-messages', data.connectionId] });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['connection', data.connectionId] });
    };
    socket.on('connection:message:new', handler);
    return () => { socket.off('connection:message:new', handler); };
  }, [socket, queryClient]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const create = useMutation({
    mutationFn: async () => apiRequest<ConnectionView>('/connections', { method: 'POST', body: {} }),
    onSuccess: (c) => { setActiveId(c.id); setError(null); void queryClient.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not create.'),
  });

  const contactMm = useMutation({
    mutationFn: async () => apiRequest<ConnectionView>('/connections/contact-middleman', { method: 'POST', body: {} }),
    onSuccess: (c) => { setActiveId(c.id); setError(null); void queryClient.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : e instanceof Error && e.message.toLowerCase().includes('unexpected') ? 'No middleman is available right now. Please try again shortly.' : (e instanceof Error ? e.message : 'No middleman available.')),
  });

  const join = useMutation({
    mutationFn: async (code: string) => apiRequest<ConnectionView>('/connections/join', { method: 'POST', body: { code } }),
    onSuccess: (c) => { setActiveId(c.id); setJoinCode(''); setError(null); void queryClient.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Invalid code.'),
  });

  // Auto-join when arriving via a shared link like /connect?join=SJKF334M.
  // Fires once after auth so the recipient doesn't have to click "Join".
  const autoJoinedRef = React.useRef(false);
  React.useEffect(() => {
    if (status !== 'authenticated' || autoJoinedRef.current) return;
    if (typeof window === 'undefined') return;
    const joinParam = new URLSearchParams(window.location.search).get('join');
    if (!joinParam) return;
    autoJoinedRef.current = true;
    join.mutate(joinParam.trim().toUpperCase());
    // Clean the URL so a refresh doesn't try to join again.
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const inviteMm = useMutation({
    mutationFn: async (id: string) => apiRequest<ConnectionView>(`/connections/${id}/invite-middleman`, { method: 'POST', body: {}, idempotencyKey: newIdempotencyKey() }),
    onSuccess: (c) => {
      setError(null);
      void queryClient.setQueryData(['connection', c.id], c);
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: ['connection-messages', c.id] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not invite a middleman.'),
  });

  const closeChat = useMutation({
    mutationFn: async (id: string) => apiRequest(`/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setActiveId(null); void queryClient.invalidateQueries({ queryKey: ['connections'] }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not close.'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSend = async (body: string, channel: Channel) => {
    if (!activeId) return;
    await apiRequest(`/connections/${activeId}/messages`, { method: 'POST', body: { body, channel } });
    void queryClient.invalidateQueries({ queryKey: ['connection-messages', activeId] });
  };

  const handleSendImage = async (file: File, channel: Channel) => {
    if (!activeId) return;
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10 MB.'); return; }
    setUploading(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': file.type, Authorization: `Bearer ${getAccessToken()}` },
        body: file,
      });
      if (!r.ok) throw new Error(`Upload failed (${r.status})`);
      const data = (await r.json()) as { file_key: string };
      await apiRequest(`/connections/${activeId}/messages`, { method: 'POST', body: { body: `${IMG_PREFIX}${data.file_key}]`, channel } });
      void queryClient.invalidateQueries({ queryKey: ['connection-messages', activeId] });
    } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (msgId: string) => {
    if (!activeId) return;
    try {
      await apiRequest(`/connections/${activeId}/messages/${msgId}`, { method: 'DELETE' });
      queryClient.setQueryData<ConnectionMessage[]>(['connection-messages', activeId], (old = []) =>
        old.map((m) => m.id === msgId ? { ...m, deletedAt: new Date().toISOString() } : m));
    } catch { /* ignore */ }
  };

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setTimeout(() => {}, 0);
  };
  const copyLink = (code: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    void navigator.clipboard?.writeText(`${base}/connect?join=${code}`);
  };

  // ── Derived state ─────────────────────────────────────────────────────────────

  if (status !== 'authenticated') {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="space-y-3 w-full max-w-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[60vh] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const connList: ConnectionView[] = Array.isArray(connections.data) ? connections.data : [];
  const a = active.data;
  const msgList: ConnectionMessage[] = Array.isArray(messages.data) ? messages.data : [];

  const myRole = !a || !user ? null
    : a.middlemanId === user.id ? 'middleman'
    : a.creatorId === user.id ? 'creator'
    : a.joinerId === user.id ? 'joiner'
    : null;

  const senderLabel = (id: string): string => {
    if (!a) return id.slice(0, 8);
    if (id === 'system') return '🤝 System';
    if (user && id === user.id) return 'You';
    if (id === a.creatorId) return a.creatorUsername ?? 'Buyer';
    if (id === a.joinerId) return a.joinerUsername ?? 'Seller';
    if (id === a.middlemanId) return `⚖️ ${a.middlemanUsername ?? 'Middleman'}`;
    return id.slice(0, 8);
  };

  const hasMiddleman = !!(a?.middlemanId);

  // Channel visibility per role
  const canSeeBuyerMm = hasMiddleman && (myRole === 'creator' || myRole === 'middleman');
  const canSeeSellerMm = hasMiddleman && (myRole === 'joiner' || myRole === 'middleman');

  // Available tabs for this connection
  const availableTabs: Channel[] = ['buyer_seller'];
  if (canSeeBuyerMm) availableTabs.push('buyer_mm');
  if (canSeeSellerMm) availableTabs.push('seller_mm');

  // Reset to first available tab when connection changes
  React.useEffect(() => {
    setActiveChannel('buyer_seller');
  }, [activeId]);

  // Can send in current channel
  const canSendInChannel = (ch: Channel): boolean => {
    if (!a?.joined) return false;
    if (a.status === 'closed') return false;
    if (ch === 'buyer_seller') return myRole !== 'middleman';
    if (ch === 'buyer_mm') return myRole === 'creator' || myRole === 'middleman';
    if (ch === 'seller_mm') return myRole === 'joiner' || myRole === 'middleman';
    return false;
  };

  /**
   * "Create deal" / "View deal" logic:
   * - Show only for buyer↔seller connections (both creatorId and joinerId present,
   *   and the current user is NOT connecting to a middleman as the joiner)
   * - A "contact middleman" connection has the middleman as the initiator; we detect
   *   this by checking if the creator IS a middleman (middlemanId === creatorId)
   * - Do NOT show if it's only a client↔middleman support chat
   */
  const isBuyerSellerConn = a && a.joinerId && (
    // Both parties exist AND the middleman is not one of the two original parties
    a.creatorId !== a.middlemanId && a.joinerId !== a.middlemanId
  );
  const showDealSection = isBuyerSellerConn && (myRole === 'creator' || myRole === 'joiner');

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl -mx-4 sm:mx-auto">
      <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border border-border/40 shadow-soft bg-background">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border/40 bg-muted/20">

          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-border/40 shrink-0">
            <h1 className="font-semibold text-base">Connect & Chat</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Secure pre-deal conversations</p>
          </div>

          {/* New conversation actions */}
          <div className="px-3 py-2 border-b border-border/40 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" disabled={create.isPending}
                onClick={() => { setError(null); create.mutate(); }}
                className="flex flex-col items-center gap-1 rounded-xl border bg-background p-2 hover:bg-muted/60 transition-colors text-center disabled:opacity-50">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-medium leading-tight">{create.isPending ? 'Creating…' : 'New chat'}</span>
              </button>
              <button type="button" disabled={contactMm.isPending}
                onClick={() => { setError(null); contactMm.mutate(); }}
                className="flex flex-col items-center gap-1 rounded-xl border bg-background p-2 hover:bg-muted/60 transition-colors text-center disabled:opacity-50">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-medium leading-tight">{contactMm.isPending ? 'Connecting…' : 'Middleman'}</span>
              </button>
            </div>
            {/* Join with code */}
            <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const t = joinCode.trim(); if (t) { setError(null); join.mutate(t); } }}>
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Join code…" className="h-7 text-xs font-mono tracking-widest flex-1" maxLength={8} />
              <Button type="submit" size="sm" variant="outline" className="h-7 text-xs px-2 shrink-0" disabled={join.isPending || !joinCode.trim()}>
                <LogIn className="h-3 w-3" />
              </Button>
            </form>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-3 mt-2 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive flex items-start gap-2 shrink-0">
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)}><X className="h-3 w-3 shrink-0 mt-0.5" /></button>
            </div>
          )}

          {/* Connection list */}
          <div className="flex-1 overflow-y-auto">
            {connections.isLoading ? (
              <div className="space-y-1 p-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : connList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No connections yet.<br />Create one or join with a code.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {connList.map((c) => (
                  <ConnItem key={c.id} c={c} active={activeId === c.id} onClick={() => setActiveId(c.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CHAT AREA ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!a ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Select a conversation</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Choose a connection from the sidebar, or create a new one to start chatting securely.
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="sm" variant="outline" disabled={create.isPending} onClick={() => { setError(null); create.mutate(); }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />{create.isPending ? 'Creating…' : 'New connection'}
                </Button>
                <Button size="sm" variant="outline" disabled={contactMm.isPending} onClick={() => { setError(null); contactMm.mutate(); }}>
                  <LifeBuoy className="h-3.5 w-3.5 mr-1.5" />{contactMm.isPending ? 'Connecting…' : 'Chat with middleman'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Connection header ── */}
              <div className="shrink-0 border-b border-border/40 px-4 py-2.5 bg-background/80 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  {/* Participants */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Buyer</span>
                        <span className="text-sm font-semibold">{a.creatorUsername ?? a.creatorId.slice(0, 8)}</span>
                      </div>
                      {a.joinerId && (
                        <>
                          <span className="text-muted-foreground text-xs">↔</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">Seller</span>
                            <span className="text-sm font-semibold">{a.joinerUsername ?? a.joinerId.slice(0, 8)}</span>
                          </div>
                        </>
                      )}
                      {a.middlemanId && (
                        <>
                          <span className="text-muted-foreground text-xs">·</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">⚖️ MM</span>
                            <span className="text-sm font-semibold">{a.middlemanUsername ?? 'Middleman'}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {/* User IDs — shown to all participants so each side knows who they're talking to */}
                    <p className="text-[10px] text-muted-foreground">
                      Buyer ID: <span className="font-mono">{a.creatorId.replace(/-/g,'').slice(0,8).toUpperCase()}</span>
                      {a.joinerId && <> · Seller ID: <span className="font-mono">{a.joinerId.replace(/-/g,'').slice(0,8).toUpperCase()}</span></>}
                      {a.middlemanId && <> · MM: <span className="font-mono">{a.middlemanId.replace(/-/g,'').slice(0,8).toUpperCase()}</span></>}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Code copy */}
                    <button type="button" onClick={() => copyCode(a.code)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted/60 hover:bg-muted rounded-lg px-2 py-1 transition-colors">
                      {a.code} <Copy className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                    {/* Share link */}
                    <button type="button" onClick={() => copyLink(a.code)}
                      className="inline-flex items-center gap-1 text-[10px] border rounded-lg px-2 py-1 hover:bg-muted/40 transition-colors">
                      <LinkIcon className="h-2.5 w-2.5" /> Copy link
                    </button>
                    {/* Invite middleman */}
                    {a.joined && !a.middlemanId && myRole !== 'middleman' && (
                      <Button size="sm" variant="outline"
                        className="h-6 text-[10px] border-amber-400/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 px-2"
                        disabled={inviteMm.isPending}
                        onClick={() => { setError(null); inviteMm.mutate(a.id); }}>
                        <Shield className="h-2.5 w-2.5 mr-1" />
                        {inviteMm.isPending ? '…' : 'Add Middleman'}
                      </Button>
                    )}
                    {/* Close */}
                    {a.status === 'open' && (
                      <button type="button" onClick={() => { if (window.confirm('Close this connection?')) closeChat.mutate(a.id); }}
                        className="text-[10px] border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg px-2 py-1 transition-colors">
                        Close
                      </button>
                    )}
                    {a.status === 'closed' && (
                      <span className="text-[10px] text-muted-foreground border rounded-lg px-2 py-1">archived</span>
                    )}
                  </div>
                </div>

                {/* Waiting banner */}
                {!a.joined && (
                  <div className="mt-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Share code <strong className="font-mono">{a.code}</strong> — chat opens once they join.
                  </div>
                )}
              </div>

              {/* ── Channel tabs ── */}
              {availableTabs.length > 1 && (
                <div className="shrink-0 border-b border-border/40 px-4 flex gap-0 bg-background/60">
                  {availableTabs.map((ch) => (
                    <button key={ch} type="button" onClick={() => setActiveChannel(ch)}
                      className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeChannel === ch
                          ? CHANNEL_META[ch].tabColor + ' bg-transparent'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}>
                      {CHANNEL_META[ch].label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Chat panel ── */}
              <div className="flex-1 min-h-0">
                <ChatPanel
                  channel={activeChannel}
                  messages={msgList}
                  isLoading={messages.isLoading}
                  canSend={canSendInChannel(activeChannel)}
                  isClosed={a.status === 'closed'}
                  myUserId={user?.id}
                  senderLabel={senderLabel}
                  onSend={handleSend}
                  onSendImage={handleSendImage}
                  onDelete={handleDelete}
                  uploading={uploading}
                />
              </div>

              {/* ── Deal section (buyer↔seller connections only) ── */}
              {showDealSection && (
                <div className="shrink-0 border-t border-border/40 bg-background/60 px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    {a.dealId ? (
                      <span className="text-xs text-muted-foreground">
                        Deal <span className="font-mono font-semibold text-foreground">{a.dealId.slice(0, 8)}</span> created
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ready to create a deal?</span>
                    )}
                  </div>
                  <Link href={a.dealId ? `/deals/${a.dealId}` : `/deals/new?connection=${a.id}`}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                    {a.dealId ? 'View deal →' : 'Create escrow deal →'}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
