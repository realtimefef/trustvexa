'use client';

/**
 * Unified inbox — pre-deal connections AND deal chats in one view.
 * Connection messages are live (4-second poll); deal-chat messages are
 * historical (REST). Both appear in the same left-hand sidebar.
 * Images are rendered via AuthImage (authenticated blob URL).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ImagePlus, Loader2, MessageSquare, Radio, VolumeX } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { apiRequest, getAccessToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';
import { useSocket } from '@/lib/socket/socket-context';
import { PresenceDot } from '@/components/presence-dot';

// ── Image renderer (same pattern as connect page) ─────────────────────────────

const API_ORIGIN_MSG = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const IMG_PREFIX_MSG = '[img:';
const IMG_OLD_PREFIX_MSG = '[image:';

function extractFileKeyFromUrl(url: string): string | null {
  try {
    const p = new URL(url);
    const idx = p.pathname.indexOf('/storage/files/');
    if (idx === -1) return null;
    const kv = p.pathname.slice(idx + '/storage/files/'.length);
    return kv.endsWith('/view') ? kv.slice(0, -5) : kv;
  } catch { return null; }
}

function AuthImageMsg({ fileKey }: { fileKey: string }) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let revoked = false;
    const src = `${API_ORIGIN_MSG}/api/v1/storage/serve/${encodeURIComponent(fileKey)}`;
    const token = getAccessToken();
    fetch(src, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' })
      .then(async r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(b => { if (!revoked) setBlobUrl(URL.createObjectURL(b)); })
      .catch(() => { if (!revoked) setFailed(true); });
    return () => {
      revoked = true;
      setBlobUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [fileKey]);
  if (failed) return <span className="text-[11px] italic text-muted-foreground">Image unavailable</span>;
  if (!blobUrl) return <span className="inline-block h-10 w-32 rounded-lg bg-muted animate-pulse" />;
  return (
    <a href={blobUrl} target="_blank" rel="noopener noreferrer"
      className="block max-w-[180px] overflow-hidden rounded-xl border border-white/10 hover:opacity-90 transition-opacity">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blobUrl} alt="Shared image" className="h-auto w-full object-cover max-h-48" loading="lazy" />
    </a>
  );
}

function MsgBodyMsg({ body }: { body: string | null }) {
  if (!body) return <span className="italic text-muted-foreground text-xs">—</span>;
  if (body.startsWith(IMG_PREFIX_MSG)) {
    return <AuthImageMsg fileKey={body.slice(IMG_PREFIX_MSG.length, -1)} />;
  }
  if (body.startsWith(IMG_OLD_PREFIX_MSG)) {
    const rawUrl = body.slice(IMG_OLD_PREFIX_MSG.length, -1);
    const fk = extractFileKeyFromUrl(rawUrl);
    if (fk) return <AuthImageMsg fileKey={fk} />;
    return <span className="italic text-muted-foreground text-xs">🖼 Image</span>;
  }
  return <span className="whitespace-pre-wrap break-words">{body}</span>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatSummary {
  id: string;
  dealId: string;
  type: string;
  status: string;
  createdAt: string;
  isMuted: boolean;
  isArchived: boolean;
  buyerId: string | null;
  sellerId: string | null;
  middlemanId: string | null;
}

interface ChatMessage {
  id: string;
  senderId: string | null;
  body: string | null;
  isEdited: boolean;
  deletedForUsers: boolean;
  createdAt: string;
}

interface ConnectionItem {
  id: string;
  code: string;
  creatorUsername: string | null;
  joinerUsername: string | null;
  middlemanId: string | null;
  middlemanUsername: string | null;
  joined: boolean;
  dealId: string | null;
}

interface ConnectionMsg {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  mine: boolean;
}

const CHAT_TYPE_LABELS: Record<string, string> = {
  buyer_seller: 'Buyer ↔ Seller',
  buyer_mm: 'Buyer ↔ Middleman',
  seller_mm: 'Seller ↔ Middleman',
  handover_mm: 'Handover ↔ Middleman',
};
function chatTypeLabel(type: string): string {
  return CHAT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ');
}
function formatTime(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleString();
}

// ── Queries ───────────────────────────────────────────────────────────────────

function useChats(enabled: boolean) {
  return useQuery({
    queryKey: ['chats'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<{ chats: ChatSummary[] }>('/chats');
      return res.chats;
    },
  });
}

function useConnections(enabled: boolean) {
  return useQuery({
    queryKey: ['connections'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<{ connections: ConnectionItem[] }>('/connections');
      return res.connections;
    },
  });
}

function useChatMessages(chatId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['chat-messages', chatId],
    enabled: enabled && chatId !== null,
    queryFn: async () => {
      const res = await apiRequest<{ messages: ChatMessage[] }>(`/chats/${chatId}/messages`);
      return res.messages;
    },
  });
}

function useConnectionMessages(connId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['connection-messages', connId],
    enabled: enabled && connId !== null,
    refetchInterval: 4000,
    queryFn: async () => {
      const res = await apiRequest<{ messages: ConnectionMsg[] }>(
        `/connections/${connId}/messages`,
      );
      return res.messages;
    },
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedKind, setSelectedKind] = React.useState<'chat' | 'connection'>('chat');
  const [archiveTab, setArchiveTab] = React.useState<'active' | 'archived'>('active');
  const [draftMsg, setDraftMsg] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [typingChats, setTypingChats] = React.useState<Record<string, boolean>>({});
  const [unreadChatIds, setUnreadChatIds] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Socket events
  React.useEffect(() => {
    if (!socket) return;
    const onTyping = (e: { chatId: string; typing: boolean }) =>
      setTypingChats((p) => ({ ...p, [e.chatId]: e.typing }));
    const onMsg = (e: { chatId: string; senderId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
      if (selectedId === e.chatId && selectedKind === 'chat') {
        void queryClient.invalidateQueries({ queryKey: ['chat-messages', e.chatId] });
      } else {
        setUnreadChatIds((p) => { const n = new Set(p); n.add(e.chatId); return n; });
      }
    };
    socket.on('typing', onTyping);
    socket.on('message:new', onMsg);
    return () => { socket.off('typing', onTyping); socket.off('message:new', onMsg); };
  }, [socket, selectedId, selectedKind, queryClient]);

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/messages');
  }, [status, router]);

  const chatsQ = useChats(status === 'authenticated');
  const connsQ = useConnections(status === 'authenticated');
  const chatMsgsQ = useChatMessages(
    selectedKind === 'chat' ? selectedId : null,
    status === 'authenticated',
  );
  const connMsgsQ = useConnectionMessages(
    selectedKind === 'connection' ? selectedId : null,
    status === 'authenticated',
  );

  const sendMsg = async () => {
    if (!draftMsg.trim() || !selectedId || selectedKind !== 'connection') return;
    setSending(true);
    try {
      await apiRequest(`/connections/${selectedId}/messages`, {
        method: 'POST',
        body: { body: draftMsg.trim() },
      });
      setDraftMsg('');
      void queryClient.invalidateQueries({ queryKey: ['connection-messages', selectedId] });
    } catch { /* noop */ } finally { setSending(false); }
  };

  const sendImage = async (file: File) => {
    if (!selectedId || selectedKind !== 'connection') return;
    if (file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    try {
      const token = getAccessToken();
      const r = await fetch(`${API_ORIGIN_MSG}/api/v1/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: file,
      });
      if (!r.ok) throw new Error('Upload failed');
      const data = (await r.json()) as { file_key: string };
      await apiRequest(`/connections/${selectedId}/messages`, {
        method: 'POST',
        body: { body: `${IMG_PREFIX_MSG}${data.file_key}]` },
      });
      void queryClient.invalidateQueries({ queryKey: ['connection-messages', selectedId] });
    } catch { /* noop */ } finally { setUploading(false); }
  };

  const toggleMute = async (chat: ChatSummary) => {
    await apiRequest(`/chats/${chat.id}/settings`, {
      method: 'PUT', body: { isMuted: !chat.isMuted },
    });
    void queryClient.invalidateQueries({ queryKey: ['chats'] });
  };

  const toggleArchive = async (chat: ChatSummary) => {
    await apiRequest(`/chats/${chat.id}/settings`, {
      method: 'PUT', body: { isArchived: !chat.isArchived },
    });
    void queryClient.invalidateQueries({ queryKey: ['chats'] });
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const allChats = chatsQ.data ?? [];
  const connections = connsQ.data ?? [];
  const selectedChat = allChats.find((c) => c.id === selectedId);
  const selectedConn = connections.find((c) => c.id === selectedId);
  const filteredChats = allChats.filter((c) =>
    archiveTab === 'archived' ? c.isArchived : !c.isArchived,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <DashboardPageHeader
        title="Messages"
        description="Conversations before deals, and deal chats — all in one place."
      />

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        {/* ── LEFT SIDEBAR ── */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Connections (pre-deal) */}
            {connections.length > 0 ? (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Conversations
                </p>
                <ul className="divide-y">
                  {connections.map((conn) => (
                    <li key={conn.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(conn.id); setSelectedKind('connection'); }}
                        className={cn(
                          'flex w-full items-start justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                          selectedId === conn.id && selectedKind === 'connection'
                            ? 'bg-primary/[0.06]' : '',
                        )}
                      >
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{conn.code}</p>
                          <p className="text-sm">
                            {conn.creatorUsername}
                            {conn.joinerUsername ? ` ↔ ${conn.joinerUsername}` : ''}
                          </p>
                          {conn.middlemanId && (
                            <p className="text-xs text-amber-600">⚖️ {conn.middlemanUsername ?? 'Middleman'}</p>
                          )}
                          {conn.dealId && (
                            <p className="font-mono text-[10px] text-muted-foreground">Deal {conn.dealId.slice(0, 8)}</p>
                          )}
                        </div>
                        {!conn.joined && (
                          <Badge variant="outline" className="text-[10px]">Waiting</Badge>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* Deal chats */}
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Deal chats
            </p>
            {chatsQ.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredChats.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {archiveTab === 'archived' ? 'No archived chats.' : 'No deal chats yet.'}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredChats.map((chat) => {
                  const opponentId = [chat.buyerId, chat.sellerId, chat.middlemanId].find(
                    (id) => id && id !== user?.id,
                  ) ?? null;
                  const isTyping = !!typingChats[chat.id];
                  const hasUnread = unreadChatIds.has(chat.id) && selectedId !== chat.id;
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(chat.id);
                          setSelectedKind('chat');
                          setUnreadChatIds((p) => { const n = new Set(p); n.delete(chat.id); return n; });
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                          selectedId === chat.id && selectedKind === 'chat' ? 'bg-primary/[0.06]' : '',
                        )}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                            {opponentId && <PresenceDot userId={opponentId} hideText className="inline-flex" />}
                            Deal {chat.dealId.slice(0, 8)}
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline">{chatTypeLabel(chat.type)}</Badge>
                            {isTyping && <span className="text-[10px] text-primary animate-pulse">Typing…</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasUnread && <Badge variant="warning" className="text-[9px] px-1">New</Badge>}
                          {chat.isMuted && <VolumeX className="h-3.5 w-3.5 text-destructive" />}
                          {chat.isArchived && <Archive className="h-3.5 w-3.5 text-warning" />}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Archive toggle */}
            <div className="flex gap-1 border-t p-2">
              {(['active', 'archived'] as const).map((tab) => (
                <button key={tab} type="button"
                  onClick={() => { setArchiveTab(tab); setSelectedId(null); }}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                    archiveTab === tab ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60',
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── RIGHT PANEL ── */}
        <Card className="flex flex-col rounded-2xl shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedKind === 'connection' && selectedConn
                    ? `${selectedConn.creatorUsername ?? ''} ↔ ${selectedConn.joinerUsername ?? '…'}`
                    : selectedKind === 'chat' && selectedChat
                      ? `Deal ${selectedChat.dealId.slice(0, 8)} — ${chatTypeLabel(selectedChat.type)}`
                      : 'Select a conversation'}
                </CardTitle>
                {selectedKind === 'chat' && selectedChat && (
                  <CardDescription>
                    {selectedChat.status === 'closed' ? 'Closed (read-only)' : 'Open'}
                  </CardDescription>
                )}
              </div>
              {selectedKind === 'chat' && selectedChat ? (
                <div className="flex gap-2">
                  <button onClick={() => void toggleMute(selectedChat)}
                    className="rounded-lg border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80">
                    {selectedChat.isMuted ? 'Unmute' : 'Mute'}
                  </button>
                  <button onClick={() => void toggleArchive(selectedChat)}
                    className="rounded-lg border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80">
                    {selectedChat.isArchived ? 'Unarchive' : 'Archive'}
                  </button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {!selectedId ? (
              <div className="flex flex-col items-center gap-2 py-20 text-center">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pick a conversation on the left.</p>
              </div>
            ) : selectedKind === 'connection' ? (
              <>
                {/* Connection messages */}
                <div className="flex-1 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3"
                  style={{ minHeight: 200, maxHeight: 420 }}>
                  {connMsgsQ.isLoading ? <Skeleton className="h-12 w-full" /> :
                    (connMsgsQ.data?.length ?? 0) === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
                    ) : connMsgsQ.data!.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
                          <MsgBodyMsg body={m.body} />
                          <span className="ml-2 text-[10px] opacity-60">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
                {selectedConn?.joined ? (
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void sendMsg(); }}>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendImage(f); }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-40">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </button>
                    <input
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Type a message…"
                      value={draftMsg}
                      onChange={(e) => setDraftMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMsg(); } }}
                    />
                    <button type="submit" disabled={sending || !draftMsg.trim()}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      Send
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Share code <span className="font-mono">{selectedConn?.code}</span> to start chatting.
                  </p>
                )}
              </>
            ) : (
              /* Deal chat — read-only history */
              <>
                {chatMsgsQ.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : chatMsgsQ.isError ? (
                  <p className="text-sm text-destructive">Unable to load this conversation.</p>
                ) : (chatMsgsQ.data ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  <ol className="space-y-3 overflow-y-auto" style={{ maxHeight: 460 }}>
                    {(chatMsgsQ.data ?? []).map((msg) => {
                      const mine = msg.senderId !== null && msg.senderId === user?.id;
                      return (
                        <li key={msg.id} className={cn('rounded-2xl border p-4 shadow-soft', mine ? 'bg-primary/[0.05]' : 'bg-card')}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">
                              {msg.senderId === null ? 'System' : mine ? 'You' : msg.senderId.slice(0, 8)}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                          </div>
                          <div className="mt-1.5 text-sm text-muted-foreground">
                            <MsgBodyMsg body={msg.body ?? null} />
                          </div>
                          {msg.isEdited || msg.deletedForUsers ? (
                            <div className="mt-2 flex gap-2">
                              {msg.isEdited && <Badge variant="secondary">Edited</Badge>}
                              {msg.deletedForUsers && <Badge variant="warning">Deleted</Badge>}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Radio className="h-3 w-3" /> Live deal chat is on the deal page.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
