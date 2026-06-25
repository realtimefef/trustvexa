'use client';

/**
 * Middleman Support & Cases panel.
 *
 * Lets the middleman:
 *   - See all support tickets across all users with status/priority filters
 *   - View ticket details and full conversation thread
 *   - Reply to tickets (body + optional status change)
 *   - Update ticket status (open → in_progress → waiting_on_user → resolved → closed)
 *   - See live stats (open / urgent / money_issue counts)
 */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  MessageSquare,
  RefreshCw,
  Send,
  TicketCheck,
  User,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

interface TicketView {
  id: string;
  userId: string;
  username: string | null;
  ticketNumber: number | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  subject: string | null;
  body: string | null;
  expectedResponseAt: string | null;
  lastUpdateAt: string | null;
  createdAt: string;
}

interface TicketReply {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: string | null;
  body: string | null;
  createdAt: string;
}

interface TicketDetail extends TicketView {
  replies: TicketReply[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  money_issue: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200',
  urgent: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200',
  normal: 'bg-muted text-muted-foreground',
};

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  in_progress: 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
  waiting_on_user: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  resolved: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  closed: 'bg-muted text-muted-foreground',
};

const VALID_STATUSES = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'] as const;

function fmtDate(v: string) {
  return new Date(v).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

// ── Ticket detail panel ────────────────────────────────────────────────────

function TicketDetailPanel({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [reply, setReply] = React.useState('');
  const [replyStatus, setReplyStatus] = React.useState<string>('in_progress');
  const [error, setError] = React.useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: async () => apiRequest<TicketDetail>(`/support/admin/tickets/${ticketId}`),
  });

  const replyMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/support/admin/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: { body: reply, status: replyStatus },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      setReply('');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Failed to send reply'),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) =>
      apiRequest(`/support/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: { status },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
  });

  const ticket = detailQuery.data;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b p-4 shrink-0">
        <div className="min-w-0">
          {detailQuery.isLoading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <h3 className="font-semibold text-sm truncate">{ticket?.subject ?? '—'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{ticket?.username ?? ticket?.userId.slice(0, 8)} ·{' '}
                {ticket?.createdAt ? fmtDate(ticket.createdAt) : '—'}
              </p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ticket && (
            <Select
              value={ticket.status ?? 'open'}
              onValueChange={(v: string) => statusMutation.mutate(v)}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {detailQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : !ticket ? (
          <p className="text-sm text-destructive">Failed to load ticket.</p>
        ) : (
          <>
            {/* Original message */}
            <div className="rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">
                  {ticket.username ?? ticket.userId.slice(0, 8)}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDate(ticket.createdAt)}</span>
                <span
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-medium border ${PRIORITY_STYLES[ticket.priority ?? 'normal'] ?? ''}`}
                >
                  {ticket.priority}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_STYLES[ticket.status ?? 'open'] ?? ''}`}
                >
                  {ticket.status?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{ticket.body}</p>
            </div>

            {/* Replies */}
            {ticket.replies.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-3 ${
                  r.authorRole === 'middleman'
                    ? 'bg-primary/5 border-primary/20 ml-4'
                    : 'bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium">
                    {r.authorRole === 'middleman' ? '⚖️ Middleman' : `User`}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{r.body}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Reply box */}
      {ticket && ticket.status !== 'closed' && (
        <div className="border-t p-4 space-y-2 shrink-0">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply…"
            className="min-h-[80px] text-sm resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={replyStatus} onValueChange={setReplyStatus}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_STATUSES.filter((s) => s !== 'open').map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    → {s.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="ml-auto h-8"
              size="sm"
              disabled={!reply.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate()}
            >
              <Send className="h-3.5 w-3.5" />
              {replyMutation.isPending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = React.useState('open');
  const [priorityFilter, setPriorityFilter] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const ticketsQuery = useQuery({
    queryKey: ['admin-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      return apiRequest<{ tickets: TicketView[]; stats: Record<string, number> }>(
        `/support/admin/tickets?${params.toString()}`,
      );
    },
    refetchInterval: 60_000,
  });

  const stats = ticketsQuery.data?.stats ?? {};
  const tickets = (ticketsQuery.data?.tickets ?? []).filter(
    (t) => !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || t.username?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalOpen = (stats.open ?? 0) + (stats.in_progress ?? 0) + (stats.waiting_on_user ?? 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Support &amp; Cases</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all user support tickets and live cases.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total open', value: totalOpen, icon: Inbox, color: 'text-blue-500' },
          { label: 'Open', value: stats.open ?? 0, icon: Clock, color: 'text-blue-400' },
          { label: 'In progress', value: stats.in_progress ?? 0, icon: RefreshCw, color: 'text-violet-500' },
          { label: 'Urgent / Money', value: (stats.urgent ?? 0) + (stats.money_issue ?? 0), icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Resolved', value: stats.resolved ?? 0, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl shadow-soft">
            <CardContent className="flex items-center gap-3 p-4">
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + list + detail */}
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        {/* Left: ticket list */}
        <Card className="rounded-2xl shadow-soft overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search by subject or user…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm flex-1 min-w-[140px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All statuses</SelectItem>
                  {VALID_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">All priorities</SelectItem>
                  <SelectItem value="money_issue" className="text-xs">💸 Money issue</SelectItem>
                  <SelectItem value="urgent" className="text-xs">🔴 Urgent</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ticketsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : ticketsQuery.isError ? (
              <p className="p-4 text-sm text-destructive">Failed to load tickets.</p>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <TicketCheck className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No tickets match the current filter.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(t.id === activeId ? null : t.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${t.id === activeId ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{t.ticketNumber ?? t.id.slice(0, 6)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${PRIORITY_STYLES[t.priority ?? 'normal'] ?? ''}`}
                        >
                          {t.priority === 'money_issue' ? '💸 money' : t.priority}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${STATUS_STYLES[t.status ?? 'open'] ?? ''}`}
                        >
                          {t.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{t.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{t.username ?? t.userId.slice(0, 8)} · {t.category} · {fmtDate(t.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right: detail panel */}
        <Card className="rounded-2xl shadow-soft overflow-hidden flex flex-col" style={{ height: '75vh' }}>
          {activeId ? (
            <TicketDetailPanel
              ticketId={activeId}
              onClose={() => setActiveId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Select a ticket to view the conversation.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
