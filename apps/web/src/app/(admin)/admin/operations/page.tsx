'use client';

/**
 * Middleman Website Operations panel.
 *
 * One-screen view of everything the operator needs to monitor and control:
 *   - System health (API / DB / Redis / Worker heartbeat)
 *   - Platform analytics (deal counts, revenue, user activity)
 *   - Emergency pause controls (new-deals, deposits, payouts, signups, chain)
 *   - Feature flags / kill switches (toggle on/off with reason)
 *   - Admin audit log (recent 50 admin actions)
 */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  FlaskConical,
  Pause,
  Play,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

interface HealthStatus {
  status: string;
  api: boolean;
  db: boolean;
  redis: boolean;
  worker?: boolean;
  uptime?: number;
}

interface AnalyticsSummary {
  activeDeals: number;
  fundedDeals: number;
  disputedDeals: number;
  completedDealsToday: number;
  newUsersToday: number;
  activeUsers: number;
  pendingPayouts: number;
  totalEscrowUsd: string;
}

interface PauseEntry {
  id: string;
  scope: string;
  reason: string;
  createdAt: string;
  createdBy?: string;
}

interface FeatureFlag {
  key: string;
  isEnabled: boolean;
  description?: string;
  updatedAt?: string;
}

interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername?: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

interface HoldView {
  id: string;
  dealId: string;
  holdType: string;
  reason: string;
  visibleMessage?: string | null;
  createdAt: string;
}

interface OverrideView {
  id: string;
  dealId: string;
  overrideType: string;
  oldValue: string;
  newValue: string;
  reason: string;
  confirmedAt?: string | null;
  createdAt: string;
}

// ── Holds & overrides ────────────────────────────────────────────────────────

function HoldRow({ hold, onReleased }: { hold: HoldView; onReleased: () => void }) {
  const [reason, setReason] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const release = async () => {
    setBusy(true); setErr(null);
    try {
      await apiRequest(`/admin/holds/${hold.id}/release`, {
        method: 'POST', body: { reason: reason.trim() }, idempotencyKey: newIdempotencyKey(),
      });
      onReleased();
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to release hold.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-blue-300/40 bg-blue-50/30 dark:bg-blue-950/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-sm font-medium">{hold.holdType.replace(/_/g, ' ')}</span>
            <span className="text-xs font-mono text-muted-foreground">deal {hold.dealId.slice(0, 8)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{hold.reason}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 border-emerald-400/50 text-emerald-700 hover:bg-emerald-50"
          onClick={() => setOpen((o) => !o)} disabled={busy}>
          <Play className="h-3 w-3" /> Release
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5">
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for releasing the hold (required)…" className="min-h-[60px] resize-none text-xs" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={() => void release()} disabled={busy || !reason.trim()}>{busy ? 'Releasing…' : 'Confirm release'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HoldsOverridesSection() {
  const qc = useQueryClient();
  const holdsQuery = useQuery({
    queryKey: ['admin-holds'],
    queryFn: () => apiRequest<{ holds: HoldView[] }>('/admin/holds'),
  });
  const overridesQuery = useQuery({
    queryKey: ['admin-overrides'],
    queryFn: () => apiRequest<{ overrides: OverrideView[] }>('/admin/overrides'),
  });
  const holds = holdsQuery.data?.holds ?? [];
  const overrides = overridesQuery.data?.overrides ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Manual review holds */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-blue-500" /> Manual review holds
          </CardTitle>
          <CardDescription>Deals you&apos;ve put on hold. Buyers/sellers see &quot;Under review&quot;; your private reason stays hidden.</CardDescription>
        </CardHeader>
        <CardContent>
          {holdsQuery.isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : holds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active holds. Place a hold from a deal in the work queue.</p>
          ) : (
            <div className="space-y-2">
              {holds.map((h) => (
                <HoldRow key={h.id} hold={h} onReleased={() => void qc.invalidateQueries({ queryKey: ['admin-holds'] })} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual overrides log */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Manual overrides
          </CardTitle>
          <CardDescription>Controlled corrections to deal state, timers, payout queue, or trust — every one confirmed and logged.</CardDescription>
        </CardHeader>
        <CardContent>
          {overridesQuery.isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No overrides recorded.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {overrides.map((o) => (
                <div key={o.id} className="rounded-xl border bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{o.overrideType.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-mono text-muted-foreground">deal {o.dealId.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="line-through">{o.oldValue || '—'}</span> → <span className="text-foreground font-medium">{o.newValue || '—'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{o.reason}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Health dot ────────────────────────────────────────────────────────────

// ── Main page ──────────────────────────────────────────────────────────────

const PAUSE_SCOPES = [
  { value: 'new_deals', label: 'New deal creation' },
  { value: 'deposits', label: 'Deposit processing' },
  { value: 'payouts', label: 'Payout processing' },
  { value: 'withdrawals', label: 'Withdrawals' },
  { value: 'signups', label: 'New signups' },
  { value: 'chain', label: 'Blockchain watchers' },
] as const;

export default function AdminOperationsPage() {
  const queryClient = useQueryClient();
  const [pauseDialog, setPauseDialog] = React.useState(false);
  const [pauseScope, setPauseScope] = React.useState<string>('new_deals');
  const [pauseReason, setPauseReason] = React.useState('');
  const [flagError, setFlagError] = React.useState<string | null>(null);
  const [pauseError, setPauseError] = React.useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiRequest<HealthStatus>('/health/full'),
    refetchInterval: 30_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => apiRequest<AnalyticsSummary>('/admin/analytics'),
    refetchInterval: 60_000,
  });

  const pausesQuery = useQuery({
    queryKey: ['admin-pauses'],
    queryFn: () => apiRequest<{ pauses: PauseEntry[] }>('/admin/pause'),
  });

  const flagsQuery = useQuery({
    queryKey: ['admin-feature-flags'],
    queryFn: () => apiRequest<{ flags: FeatureFlag[] }>('/admin/feature-flags'),
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-log'],
    queryFn: () => apiRequest<{ entries: AuditLogEntry[] }>('/admin/audit-log?limit=30'),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const startPauseMutation = useMutation({
    mutationFn: async () =>
      apiRequest('/admin/pause', {
        method: 'POST',
        body: { scope: pauseScope, reason: pauseReason },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      setPauseDialog(false);
      setPauseReason('');
      setPauseError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-pauses'] });
    },
    onError: (e) => setPauseError(e instanceof ApiError ? e.message : 'Failed to start pause'),
  });

  const endPauseMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/admin/pause/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-pauses'] });
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ key, isEnabled }: { key: string; isEnabled: boolean }) =>
      apiRequest(`/admin/feature-flags/${key}`, {
        method: 'PATCH',
        body: { isEnabled, reason: isEnabled ? 'Enabled via operations panel' : 'Disabled via operations panel' },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      setFlagError(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-feature-flags'] });
    },
    onError: (e) => setFlagError(e instanceof ApiError ? e.message : 'Failed to toggle flag'),
  });

  const health = healthQuery.data;
  const analytics = analyticsQuery.data;
  const pauses = pausesQuery.data?.pauses ?? [];
  const flags = flagsQuery.data?.flags ?? [];
  const auditEntries = auditQuery.data?.entries ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System health, circuit breakers, feature flags, and audit activity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void queryClient.invalidateQueries();
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh all
        </Button>
      </div>

      {/* System health */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Server,
            label: 'API server',
            ok: health?.api ?? null,
            loading: healthQuery.isLoading,
          },
          {
            icon: Database,
            label: 'Database',
            ok: health?.db ?? null,
            loading: healthQuery.isLoading,
          },
          {
            icon: Zap,
            label: 'Redis',
            ok: health?.redis ?? null,
            loading: healthQuery.isLoading,
          },
          {
            icon: Activity,
            label: 'Worker',
            ok: health?.worker ?? null,
            loading: healthQuery.isLoading,
          },
        ].map((s) => (
          <Card key={s.label} className={`rounded-2xl shadow-soft border ${s.ok === false ? 'border-destructive/50 bg-destructive/5' : s.ok === true ? 'border-emerald-500/30' : ''}`}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.ok === true ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : s.ok === false ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {s.loading ? (
                  <Skeleton className="h-4 w-16 mt-0.5" />
                ) : (
                  <p className={`text-sm font-semibold ${s.ok === true ? 'text-emerald-600' : s.ok === false ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {s.ok === true ? 'Healthy' : s.ok === false ? 'Degraded' : 'Unknown'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics summary */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" /> Platform analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Active deals', value: analytics?.activeDeals ?? 0, color: 'text-blue-500' },
                { label: 'Funded deals', value: analytics?.fundedDeals ?? 0, color: 'text-violet-500' },
                { label: 'Open disputes', value: analytics?.disputedDeals ?? 0, color: 'text-red-500' },
                { label: 'Completed today', value: analytics?.completedDealsToday ?? 0, color: 'text-emerald-500' },
                { label: 'New users today', value: analytics?.newUsersToday ?? 0, color: 'text-blue-400' },
                { label: 'Active users', value: analytics?.activeUsers ?? 0, color: 'text-primary' },
                { label: 'Pending payouts', value: analytics?.pendingPayouts ?? 0, color: 'text-amber-500' },
                { label: 'Total in escrow', value: analytics?.totalEscrowUsd ?? '—', color: 'text-emerald-600' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Emergency pauses */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Pause className="h-4 w-4 text-amber-500" /> Circuit breakers
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setPauseDialog(true)}>
                <Pause className="h-3.5 w-3.5" /> New pause
              </Button>
            </div>
            <CardDescription>
              Emergency stops for specific platform operations. Each pause is logged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pauses.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 p-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">All systems running normally. No active pauses.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pauses.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-amber-300/50 bg-amber-50/30 dark:bg-amber-950/20 px-3 py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm font-medium">{p.scope.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.reason}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 ml-2 border-emerald-400/50 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => endPauseMutation.mutate(p.id)}
                      disabled={endPauseMutation.isPending}
                    >
                      <Play className="h-3 w-3" /> Resume
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature flags */}
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-4 w-4 text-primary" /> Feature flags
            </CardTitle>
            <CardDescription>Toggle platform features without a deployment.</CardDescription>
          </CardHeader>
          <CardContent>
            {flagError && (
              <Alert variant="destructive" className="mb-3 py-2">
                <AlertDescription className="text-xs">{flagError}</AlertDescription>
              </Alert>
            )}
            {flagsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : flags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feature flags configured.</p>
            ) : (
              <div className="space-y-1 divide-y">
                {flags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0 mr-4">
                      <p className="text-sm font-medium font-mono">{flag.key}</p>
                      {flag.description && (
                        <p className="text-xs text-muted-foreground truncate">{flag.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium ${flag.isEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {flag.isEnabled ? 'ON' : 'OFF'}
                      </span>
                      <Switch
                        checked={flag.isEnabled}
                        onCheckedChange={(checked: boolean) =>
                          toggleFlagMutation.mutate({ key: flag.key, isEnabled: checked })
                        }
                        disabled={toggleFlagMutation.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holds & overrides */}
      <HoldsOverridesSection />

      {/* Audit log */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" /> Recent admin actions
          </CardTitle>
          <CardDescription>Last 30 enforcement and settings-change events.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : auditEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin actions recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{entry.targetType}/</span>
                      <span className="font-mono">{entry.targetId.slice(0, 8)}</span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.actorUsername ?? entry.actorId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">
                      {entry.reason}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Start pause dialog */}
      <Dialog open={pauseDialog} onOpenChange={setPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Start emergency pause
            </DialogTitle>
            <DialogDescription>
              This immediately stops the selected platform operation. All pauses are logged
              in the audit trail and visible to all middlemen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {pauseError && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{pauseError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">Scope</Label>
              <Select value={pauseScope} onValueChange={setPauseScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAUSE_SCOPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pause-reason" className="text-sm">
                Reason <span className="text-muted-foreground">(required)</span>
              </Label>
              <Textarea
                id="pause-reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Describe why this operation is being paused…"
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPauseDialog(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!pauseReason.trim() || startPauseMutation.isPending}
                onClick={() => startPauseMutation.mutate()}
              >
                <Pause className="h-3.5 w-3.5" />
                {startPauseMutation.isPending ? 'Starting…' : 'Pause now'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
