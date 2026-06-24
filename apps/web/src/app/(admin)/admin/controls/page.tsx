'use client';

/**
 * Trust & Safety / Compliance controls (admin == middleman).
 *
 * One screen for the sensitive operator powers that previously had no UI:
 *   - Legal holds (evidence-preservation; blocks payouts via preflight)
 *   - Appeal / unblock requests (review + reinstate)
 *   - AML / suspicious-activity alerts (triage)
 *   - Break-glass / emergency-recovery audit (record + view)
 *   - Audited PII access (decrypt email / signup details; every view logged)
 *
 * Wired to /admin/* endpoints; all writes carry an Idempotency-Key and are
 * hash-chain audited server-side.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Eye, KeyRound, Scale, ShieldAlert, Siren, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : '—');

// ── Legal holds ──────────────────────────────────────────────────────────────

interface LegalHold { id: string; targetType: string; targetId: string | null; reason: string | null; placedAt: string | null }

function LegalHoldsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-legal-holds'], queryFn: () => apiRequest<{ holds: LegalHold[] }>('/admin/legal-holds') });
  const [targetType, setTargetType] = React.useState<'deal' | 'user'>('deal');
  const [targetId, setTargetId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const holds = q.data?.holds ?? [];

  const place = async () => {
    setBusy(true); setErr(null);
    try {
      await apiRequest('/admin/legal-holds', { method: 'POST', body: { targetType, targetId: targetId.trim(), reason: reason.trim() }, idempotencyKey: newIdempotencyKey() });
      setTargetId(''); setReason('');
      void qc.invalidateQueries({ queryKey: ['admin-legal-holds'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to place hold.'); }
    finally { setBusy(false); }
  };
  const release = async (id: string) => {
    const r = window.prompt('Reason for releasing this legal hold?');
    if (!r || !r.trim()) return;
    try {
      await apiRequest(`/admin/legal-holds/${id}/release`, { method: 'POST', body: { reason: r.trim() }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['admin-legal-holds'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to release hold.'); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-amber-500" /> Legal holds</CardTitle>
        <CardDescription>Evidence-preservation mode. A hold on a deal blocks its payout via preflight and prevents deletion/anonymisation.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="grid gap-2 sm:grid-cols-[110px_1fr] items-end">
          <div className="space-y-1">
            <Label className="text-xs">Target</Label>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as 'deal' | 'user')} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
              <option value="deal">Deal</option>
              <option value="user">User</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{targetType} ID (UUID)</Label>
            <Input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="00000000-0000-…" className="h-8 text-xs font-mono" />
          </div>
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for the legal hold (required)…" className="min-h-[56px] resize-none text-xs" />
        <Button size="sm" disabled={busy || !targetId.trim() || !reason.trim()} onClick={() => void place()}>
          <Scale className="h-3.5 w-3.5 mr-1.5" />{busy ? 'Placing…' : 'Place legal hold'}
        </Button>
        <div className="space-y-1.5 pt-1">
          {q.isLoading ? <Skeleton className="h-12 w-full" /> : holds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active legal holds.</p>
          ) : holds.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-lg border border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/20 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium"><span className="uppercase">{h.targetType}</span> <span className="font-mono">{h.targetId?.slice(0, 8)}</span></p>
                <p className="text-[11px] text-muted-foreground truncate">{h.reason} · {fmt(h.placedAt)}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => void release(h.id)}>Release</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Appeals ──────────────────────────────────────────────────────────────────

interface Appeal { id: string; userId: string; username: string | null; restrictionType: string | null; reason: string | null; status: string | null; decisionReason: string | null; createdAt: string | null }

function AppealsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-appeals'], queryFn: () => apiRequest<{ appeals: Appeal[] }>('/admin/appeals') });
  const [err, setErr] = React.useState<string | null>(null);
  const appeals = q.data?.appeals ?? [];

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    const r = window.prompt(`Reason for ${decision === 'approved' ? 'approving (this reinstates the account)' : 'rejecting'} this appeal?`);
    if (!r || !r.trim()) return;
    try {
      await apiRequest(`/admin/appeals/${id}/decide`, { method: 'POST', body: { decision, decisionReason: r.trim() }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['admin-appeals'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to decide appeal.'); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-blue-500" /> Appeal / unblock requests</CardTitle>
        <CardDescription>Review blocked/restricted users&apos; appeals. Approving reinstates the account.</CardDescription>
      </CardHeader>
      <CardContent>
        {err && <p className="text-xs text-destructive mb-2">{err}</p>}
        {q.isLoading ? <Skeleton className="h-16 w-full" /> : appeals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appeals submitted.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {appeals.map((a) => (
              <div key={a.id} className="rounded-xl border bg-muted/20 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.username ?? a.userId.slice(0, 8)} <span className="text-xs text-muted-foreground">· {a.restrictionType ?? 'restriction'}</span></p>
                    <p className="text-xs text-muted-foreground">{a.reason ?? '—'}</p>
                  </div>
                  <Badge variant={a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'destructive' : 'warning'}>{a.status ?? 'pending'}</Badge>
                </div>
                {(!a.status || a.status === 'pending') && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs" onClick={() => void decide(a.id, 'approved')}><CheckCircle2 className="h-3 w-3 mr-1" />Approve & reinstate</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive" onClick={() => void decide(a.id, 'rejected')}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── AML alerts ───────────────────────────────────────────────────────────────

interface AmlAlert { id: string; userId: string | null; username: string | null; dealId: string | null; patternType: string | null; severity: string | null; details: string | null; status: string | null; createdAt: string | null }
const AML_NEXT: Record<string, string> = { open: 'reviewing', reviewing: 'cleared' };

function AmlAlertsCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-aml-alerts'], queryFn: () => apiRequest<{ alerts: AmlAlert[] }>('/admin/aml-alerts') });
  const [err, setErr] = React.useState<string | null>(null);
  const alerts = q.data?.alerts ?? [];

  const setStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/admin/aml-alerts/${id}`, { method: 'PATCH', body: { status }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['admin-aml-alerts'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to update alert.'); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Siren className="h-4 w-4 text-red-500" /> AML / suspicious-activity alerts</CardTitle>
        <CardDescription>Triage flagged patterns. Cleared/escalated decisions are audited.</CardDescription>
      </CardHeader>
      <CardContent>
        {err && <p className="text-xs text-destructive mb-2">{err}</p>}
        {q.isLoading ? <Skeleton className="h-16 w-full" /> : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AML alerts.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.map((al) => (
              <div key={al.id} className="rounded-xl border bg-muted/20 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{al.patternType ?? 'pattern'} <span className={`text-xs ${al.severity === 'high' || al.severity === 'critical' ? 'text-destructive' : 'text-amber-600'}`}>· {al.severity}</span></p>
                    <p className="text-xs text-muted-foreground">{al.username ?? al.userId?.slice(0, 8) ?? '—'}{al.dealId ? ` · deal ${al.dealId.slice(0, 8)}` : ''}</p>
                    {al.details && <p className="text-xs text-muted-foreground">{al.details}</p>}
                  </div>
                  <Badge variant={al.status === 'cleared' ? 'success' : al.status === 'escalated' ? 'destructive' : 'warning'}>{al.status ?? 'open'}</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  {al.status && AML_NEXT[al.status] && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => void setStatus(al.id, AML_NEXT[al.status as string] as string)}>
                      Mark {AML_NEXT[al.status]}
                    </Button>
                  )}
                  {al.status !== 'escalated' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/40 text-destructive" onClick={() => void setStatus(al.id, 'escalated')}>Escalate</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── PII access ───────────────────────────────────────────────────────────────

const PII_FIELD_OPTS = [
  { key: 'email', label: 'Email' },
  { key: 'signup_details', label: 'Sign-up details' },
  { key: 'recovery_email', label: 'Recovery email' },
] as const;

function PiiLookupCard() {
  const [userId, setUserId] = React.useState('');
  const [fields, setFields] = React.useState<Set<string>>(new Set(['email']));
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ username: string | null; values: Array<{ field: string; value: string | null }> } | null>(null);

  const toggle = (k: string) => setFields((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const lookup = async () => {
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await apiRequest<{ username: string | null; values: Array<{ field: string; value: string | null }> }>(
        `/admin/users/${userId.trim()}/pii`,
        { method: 'POST', body: { fields: [...fields], reason: reason.trim() }, idempotencyKey: newIdempotencyKey() },
      );
      setResult(res);
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Lookup failed.'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-violet-500" /> PII access (audited)</CardTitle>
        <CardDescription>Decrypt a user&apos;s personal info for a dispute/investigation. Every view is logged to pii_access_logs. The password is never accessible.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="space-y-1">
          <Label className="text-xs">User ID (UUID)</Label>
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="00000000-0000-…" className="h-8 text-xs font-mono" />
        </div>
        <div className="flex flex-wrap gap-3">
          {PII_FIELD_OPTS.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" checked={fields.has(f.key)} onChange={() => toggle(f.key)} /> {f.label}
            </label>
          ))}
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for accessing this PII (required, audited)…" className="min-h-[56px] resize-none text-xs" />
        <Button size="sm" disabled={busy || !userId.trim() || !reason.trim() || fields.size === 0} onClick={() => void lookup()}>
          <Eye className="h-3.5 w-3.5 mr-1.5" />{busy ? 'Decrypting…' : 'Reveal & log access'}
        </Button>
        {result && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1">
            <p className="text-xs font-semibold">{result.username ?? 'User'}</p>
            {result.values.map((v) => (
              <p key={v.field} className="text-xs"><span className="text-muted-foreground">{v.field}:</span> <span className="font-mono break-all">{v.value ?? '—'}</span></p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Break-glass ──────────────────────────────────────────────────────────────

interface BreakGlassEvent { id: string; actorLabel: string | null; action: string | null; reason: string | null; createdAt: string | null }
const BG_ACTIONS = [
  { value: 'procedure_tested', label: 'Procedure tested' },
  { value: 'recovery_initiated', label: 'Recovery initiated' },
  { value: 'access_restored', label: 'Access restored' },
] as const;

function BreakGlassCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-break-glass'], queryFn: () => apiRequest<{ events: BreakGlassEvent[] }>('/admin/break-glass') });
  const [actorLabel, setActorLabel] = React.useState('');
  const [action, setAction] = React.useState<string>('procedure_tested');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const events = q.data?.events ?? [];

  const record = async () => {
    setBusy(true); setErr(null);
    try {
      await apiRequest('/admin/break-glass', { method: 'POST', body: { actorLabel: actorLabel.trim(), action, reason: reason.trim() }, idempotencyKey: newIdempotencyKey() });
      setActorLabel(''); setReason('');
      void qc.invalidateQueries({ queryKey: ['admin-break-glass'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to record event.'); }
    finally { setBusy(false); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-orange-500" /> Break-glass / emergency recovery</CardTitle>
        <CardDescription>Record and audit backup-admin recovery events and drills.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Actor label</Label>
            <Input value={actorLabel} onChange={(e) => setActorLabel(e.target.value)} placeholder="e.g. backup-operator-1" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action</Label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
              {BG_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / context (required)…" className="min-h-[56px] resize-none text-xs" />
        <Button size="sm" disabled={busy || !actorLabel.trim() || !reason.trim()} onClick={() => void record()}>
          {busy ? 'Recording…' : 'Record event'}
        </Button>
        <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
          {q.isLoading ? <Skeleton className="h-10 w-full" /> : events.length === 0 ? (
            <p className="text-xs text-muted-foreground">No break-glass events recorded.</p>
          ) : events.map((e) => (
            <div key={e.id} className="rounded-lg bg-muted/30 px-3 py-1.5">
              <p className="text-xs font-medium">{e.action} · {e.actorLabel}</p>
              <p className="text-[11px] text-muted-foreground">{e.reason} · {fmt(e.createdAt)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Withdrawal allowlist (custody) ───────────────────────────────────────────

interface AllowlistEntry { id: string; coin: string | null; network: string | null; address: string | null; label: string | null; isActive: boolean; activeFrom: string | null }

function AllowlistCard() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-allowlist'], queryFn: () => apiRequest<{ entries: AllowlistEntry[]; nowIso: string }>('/admin/withdrawal-allowlist') });
  const [coin, setCoin] = React.useState('USDT');
  const [network, setNetwork] = React.useState('TRON');
  const [address, setAddress] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [delayHours, setDelayHours] = React.useState('24');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const entries = q.data?.entries ?? [];
  const now = q.data?.nowIso ? new Date(q.data.nowIso).getTime() : Date.now();

  const add = async () => {
    setBusy(true); setErr(null);
    try {
      await apiRequest('/admin/withdrawal-allowlist', { method: 'POST', body: { coin: coin.trim(), network: network.trim(), address: address.trim(), label: label.trim() || null, delayHours: Number(delayHours) || 0 }, idempotencyKey: newIdempotencyKey() });
      setAddress(''); setLabel('');
      void qc.invalidateQueries({ queryKey: ['admin-allowlist'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to add address.'); }
    finally { setBusy(false); }
  };
  const toggle = async (id: string, isActive: boolean) => {
    try {
      await apiRequest(`/admin/withdrawal-allowlist/${id}`, { method: 'PATCH', body: { isActive }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['admin-allowlist'] });
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Failed to update.'); }
  };

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4 text-emerald-500" /> Withdrawal allowlist</CardTitle>
        <CardDescription>Operator payout addresses. New entries activate after a time-delay; payouts can only go to an active, elapsed entry.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="grid gap-2 sm:grid-cols-4">
          <Input value={coin} onChange={(e) => setCoin(e.target.value)} placeholder="Coin" className="h-8 text-xs" />
          <Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="Network" className="h-8 text-xs" />
          <Input value={delayHours} onChange={(e) => setDelayHours(e.target.value)} placeholder="Delay (h)" type="number" min="0" max="168" className="h-8 text-xs" />
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-8 text-xs" />
        </div>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Payout address" className="h-8 text-xs font-mono" />
        <Button size="sm" disabled={busy || !address.trim() || !coin.trim() || !network.trim()} onClick={() => void add()}>
          {busy ? 'Adding…' : 'Add address (time-delayed)'}
        </Button>
        <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto">
          {q.isLoading ? <Skeleton className="h-10 w-full" /> : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No allowlisted addresses.</p>
          ) : entries.map((e) => {
            const pending = e.activeFrom ? new Date(e.activeFrom).getTime() > now : false;
            return (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5">
                <div className="min-w-0">
                  <p className="text-xs font-medium">{e.coin}/{e.network} {e.label ? `· ${e.label}` : ''}</p>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">{e.address}</p>
                  <p className="text-[10px] text-muted-foreground">{!e.isActive ? 'Revoked' : pending ? `Active from ${fmt(e.activeFrom)}` : 'Active'}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => void toggle(e.id, !e.isActive)}>
                  {e.isActive ? 'Revoke' : 'Enable'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminControlsPage() {
  const router = useRouter();
  const { status } = useAuth();
  React.useEffect(() => { if (status === 'anonymous') router.replace('/login?next=/admin/controls'); }, [status, router]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight">Trust &amp; Safety / Compliance</h1>
        <p className="text-sm text-muted-foreground">Legal holds, appeals, AML alerts, break-glass recovery, and audited PII access — operator-only.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <LegalHoldsCard />
        <AppealsCard />
        <AmlAlertsCard />
        <PiiLookupCard />
        <AllowlistCard />
        <BreakGlassCard />
      </div>
    </div>
  );
}
