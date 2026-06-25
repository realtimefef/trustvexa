'use client';

/**
 * Payout queue — operator dual-control release screen (admin == middleman).
 *
 * Every seller payout / buyer refund enters the queue as `pending`. The operator
 * performs a two-step release:
 *   1. Approve  (POST /payouts/:id/approve)   — runs the substantive preflight.
 *   2. Broadcast (POST /payouts/:id/broadcast) — re-runs the FULL preflight
 *      (incl. two-step signing) and only then sends on-chain.
 * The preflight result (and any failed check) is shown after each action so the
 * operator can see exactly why a payout is or isn't releasable. (Plan: Money —
 * payout queue, dual control, preflight, 2-step confirmation.)
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, CheckCircle2, Clock, DollarSign, RefreshCw, ShieldCheck, XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, ApiError, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface PreflightResult { check: string; passed: boolean }
interface Preflight { authorized: boolean; failedCheck: string | null; results: PreflightResult[] }
interface PayoutItem {
  id: string;
  dealId: string;
  payeeId: string | null;
  coin: string | null;
  network: string | null;
  address: string | null;
  amountCoin: string | null;
  amountSmallestUnit: string | null;
  preflightStatus: string | null;
  gasReserveStatus: string | null;
  status: 'pending' | 'approved' | 'broadcast' | string;
  holdUntil: string | null;
  txHash: string | null;
  versionNo: number;
  createdAt: string | null;
}

function usePayoutQueue(enabled: boolean) {
  return useQuery({
    queryKey: ['payout-queue'],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => (await apiRequest<{ items: PayoutItem[] }>('/payouts/queue')).items,
  });
}

const STATUS_META: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' | 'default' }> = {
  pending: { label: 'Pending — needs approval', variant: 'warning' },
  approved: { label: 'Approved — ready to broadcast', variant: 'default' },
  broadcast: { label: 'Broadcast — sent on-chain', variant: 'success' },
};

function PreflightList({ preflight }: { preflight: Preflight }) {
  if (!preflight.results.length && preflight.authorized) {
    return <p className="text-xs text-emerald-600">✓ All preflight checks passed.</p>;
  }
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">Preflight checks</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
        {preflight.results.map((r) => (
          <div key={r.check} className="flex items-center gap-1.5 text-xs">
            {r.passed
              ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              : <XCircle className="h-3 w-3 text-destructive shrink-0" />}
            <span className={r.passed ? 'text-muted-foreground' : 'text-destructive font-medium'}>
              {r.check.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
      {preflight.failedCheck && (
        <p className="text-xs text-destructive pt-1">
          Blocked by: <strong>{preflight.failedCheck.replace(/_/g, ' ')}</strong>
        </p>
      )}
    </div>
  );
}

function PayoutCard({ item }: { item: PayoutItem }) {
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [preflight, setPreflight] = React.useState<Preflight | null>(null);
  const [confirmBroadcast, setConfirmBroadcast] = React.useState(false);

  const meta = STATUS_META[item.status] ?? { label: item.status, variant: 'secondary' as const };

  const act = async (action: 'approve' | 'broadcast') => {
    setBusy(true); setErr(null);
    try {
      const res = await apiRequest<{ status: string; preflight: Preflight }>(
        `/payouts/${item.id}/${action}`,
        { method: 'POST', idempotencyKey: newIdempotencyKey() },
      );
      setPreflight(res.preflight ?? null);
      setConfirmBroadcast(false);
      void qc.invalidateQueries({ queryKey: ['payout-queue'] });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Action failed.');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <Link href={`/admin?deal=${item.dealId}`} className="text-xs font-mono text-primary hover:underline">
              Deal {item.dealId.slice(0, 8)}
            </Link>
          </div>
          <p className="mt-1.5 font-display text-lg font-bold">
            {item.amountCoin ?? '—'} {item.coin}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">· {item.network}</span>
          </p>
          <p className="text-xs text-muted-foreground font-mono break-all mt-0.5">→ {item.address ?? '—'}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
            <span>Preflight: {item.preflightStatus ?? 'not run'}</span>
            <span>Gas: {item.gasReserveStatus ?? 'n/a'}</span>
            {item.holdUntil && <span className="text-amber-600">Hold until {new Date(item.holdUntil).toLocaleString()}</span>}
            {item.txHash && <span className="font-mono">tx {item.txHash.slice(0, 10)}…</span>}
          </div>
        </div>
      </div>

      {err && <p className="text-xs text-destructive">⚠️ {err}</p>}
      {preflight && <PreflightList preflight={preflight} />}

      <div className="flex flex-wrap gap-2">
        {item.status === 'pending' && (
          <Button size="sm" disabled={busy} onClick={() => void act('approve')}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />{busy ? 'Approving…' : 'Approve (step 1 of 2)'}
          </Button>
        )}
        {item.status === 'approved' && !confirmBroadcast && (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmBroadcast(true)}>
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />Broadcast on-chain (step 2 of 2)
          </Button>
        )}
        {item.status === 'approved' && confirmBroadcast && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <span className="text-xs text-destructive font-medium">Irreversible — send funds now?</span>
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => void act('broadcast')}>
              {busy ? 'Broadcasting…' : 'Confirm & send'}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmBroadcast(false)}>Cancel</Button>
          </div>
        )}
        {item.status === 'broadcast' && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sent on-chain
          </span>
        )}
      </div>
    </div>
  );
}

export default function PayoutQueuePage() {
  const router = useRouter();
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/admin/payouts');
  }, [status, router]);

  const queueQ = usePayoutQueue(status === 'authenticated');
  const items = queueQ.data ?? [];
  const pending = items.filter((i) => i.status === 'pending').length;
  const approved = items.filter((i) => i.status === 'approved').length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">Payout queue</h1>
          <p className="text-sm text-muted-foreground">
            Two-step release: approve, then broadcast. Every payout runs an on-chain preflight
            (deal status, dispute, address, chain, amount, gas, cap, allowlist, ledger balance).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void queueQ.refetch()}>
          <RefreshCw className={`h-3.5 w-3.5 ${queueQ.isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'In queue', value: items.length, icon: DollarSign, color: 'text-primary' },
          { label: 'Awaiting approval', value: pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Ready to send', value: approved, icon: ShieldCheck, color: 'text-blue-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className="font-display text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {queueQ.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}</div>
      ) : queueQ.isError ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/20 px-4 py-3">
          Unable to load the payout queue. You may not have operator access.
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/10 px-6 py-12 text-center">
          <CheckCircle2 className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">No payouts in the queue</p>
          <p className="text-xs text-muted-foreground mt-1">Seller payouts and buyer refunds appear here for review before release.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <PayoutCard key={item.id} item={item} />)}
        </div>
      )}

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Broadcasting is only enabled once the operator completes the go-live checklist
          (<span className="font-mono">MAINNET_ENABLED</span>). Until then, approvals run but the
          final broadcast is blocked by design.
        </p>
      </div>
    </div>
  );
}
