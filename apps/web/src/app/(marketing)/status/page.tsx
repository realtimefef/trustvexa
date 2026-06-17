'use client';

/**
 * Public platform status page (Project Plan §12 "Site pages").
 *
 * Client component that reads `GET /api/v1/status` through the shared
 * {@link apiRequest} client and TanStack Query, mirroring the data-fetching
 * pattern used by the authenticated app pages. Overall status, active pauses,
 * and per-area / per-chain rows are derived from the response; any area the
 * response does not mention is shown as "Operational" by default.
 */
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Server,
  Wallet,
  Send,
  RefreshCw,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { apiRequest } from '@/lib/api/client';

type OverallStatus = 'operational' | 'degraded';

interface PausedScope {
  scope: string;
  reason: string | null;
  since: string | null;
}

interface PlatformStatus {
  status: OverallStatus;
  pausedScopes: PausedScope[];
  checkedAt: string | null;
}

type ComponentRow = { key: string; label: string; icon: typeof Server };

// Per-chain and core service rows we surface on the public status page. Each is
// matched against the API's paused-scope list (case-insensitive substring) to
// decide whether it is operational or paused. Anything not present in the
// response is treated as operational.
const CHAINS: ReadonlyArray<ComponentRow> = [
  { key: 'eth', label: 'Ethereum (ETH / ERC-20)', icon: Activity },
  { key: 'bnb', label: 'BNB Chain (BNB / BEP-20)', icon: Activity },
  { key: 'tron', label: 'Tron (TRX / TRC-20)', icon: Activity },
  { key: 'solana', label: 'Solana (SOL)', icon: Activity },
];

const SERVICES: ReadonlyArray<ComponentRow> = [
  { key: 'app', label: 'Application', icon: Server },
  { key: 'email', label: 'Email & notifications', icon: Mail },
  { key: 'deposits', label: 'Deposits', icon: Wallet },
  { key: 'payout', label: 'Payout queue', icon: Send },
];

function matchPause(rowKey: string, paused: PausedScope[]): PausedScope | null {
  const needle = rowKey.toLowerCase();
  return (
    paused.find((p) => {
      const scope = (p.scope ?? '').toLowerCase();
      return scope.includes(needle) || needle.includes(scope);
    }) ?? null
  );
}

function StatusRow({ row, paused }: { row: ComponentRow; paused: PausedScope[] }) {
  const hit = matchPause(row.key, paused);
  const isPaused = hit !== null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-card/60 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <row.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">{row.label}</span>
      </div>
      {isPaused ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Paused
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Operational
        </span>
      )}
    </div>
  );
}

function useStatus() {
  return useQuery({
    queryKey: ['platform-status'],
    queryFn: async () => {
      const res = await apiRequest<Partial<PlatformStatus>>('/status');
      // Normalise the response so the page can render defensively even if a
      // field is missing — missing areas default to operational.
      const normalised: PlatformStatus = {
        status: res.status === 'degraded' ? 'degraded' : 'operational',
        pausedScopes: Array.isArray(res.pausedScopes) ? res.pausedScopes : [],
        checkedAt: typeof res.checkedAt === 'string' ? res.checkedAt : null,
      };
      return normalised;
    },
    // Keep the public status reasonably fresh without hammering the API.
    refetchInterval: 60_000,
  });
}

export default function StatusPage() {
  const { data, isLoading, isError } = useStatus();

  const paused = data?.pausedScopes ?? [];
  const isDegraded = data?.status === 'degraded';

  // Banner copy reflects loading → error → degraded → operational, in priority
  // order. On an unreachable feed we assume operational but note the issue.
  const bannerTitle = isLoading
    ? 'Checking status…'
    : isError
      ? 'Live status unavailable'
      : isDegraded
        ? 'Some systems are paused'
        : 'All systems operational';

  const bannerBody = isLoading
    ? 'Fetching the latest platform status.'
    : isError
      ? 'We could not reach the status feed just now. Services are assumed operational — try refreshing in a moment.'
      : isDegraded
        ? 'One or more scopes are temporarily paused. Details are below.'
        : 'Deals, deposits, and payouts are running normally.';

  // The amber/warning treatment covers both a degraded platform and a feed we
  // could not reach; the emerald treatment is the healthy default.
  const warn = isDegraded || isError;

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Status
          </>
        }
        title="Platform status"
        subtitle="Live view of TrustVexa services and supported networks. If anything is paused, you will see it here with the reason."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-10">
          {/* Overall banner */}
          <Reveal>
            <div
              className={
                warn
                  ? 'flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-6'
                  : 'flex items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-6'
              }
            >
              <span
                className={
                  warn
                    ? 'inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500'
                    : 'inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500'
                }
              >
                {isLoading ? (
                  <RefreshCw className="h-6 w-6 animate-spin" aria-hidden="true" />
                ) : warn ? (
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                )}
              </span>
              <div>
                <p className="font-display text-lg font-semibold">{bannerTitle}</p>
                <p className="text-sm text-muted-foreground">{bannerBody}</p>
              </div>
            </div>
          </Reveal>

          {/* Incident / pause detail */}
          {!isLoading && paused.length > 0 ? (
            <Reveal>
              <div className="space-y-3 rounded-2xl border bg-card/60 p-6 backdrop-blur">
                <p className="font-display font-semibold">Active incidents</p>
                <ul className="space-y-3">
                  {paused.map((p, i) => (
                    <li key={`${p.scope}-${i}`} className="rounded-xl border bg-background/40 p-4">
                      <p className="text-sm font-medium capitalize">{p.scope}</p>
                      {p.reason ? (
                        <p className="mt-1 text-sm text-muted-foreground">{p.reason}</p>
                      ) : null}
                      {p.since ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Since {new Date(p.since).toLocaleString()}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ) : null}

          {/* Networks */}
          <Reveal>
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Networks</h2>
              <div className="grid gap-3">
                {CHAINS.map((row) => (
                  <StatusRow key={row.key} row={row} paused={paused} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Services */}
          <Reveal delay={80}>
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold">Services</h2>
              <div className="grid gap-3">
                {SERVICES.map((row) => (
                  <StatusRow key={row.key} row={row} paused={paused} />
                ))}
              </div>
            </div>
          </Reveal>

          {/* Incident-banner note + footer meta */}
          <Reveal delay={120}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-5">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {data?.checkedAt
                  ? `Last checked ${new Date(data.checkedAt).toLocaleString()}`
                  : 'Live status, refreshed automatically'}
              </p>
              <p className="text-xs text-muted-foreground">
                Seeing an issue not listed here?{' '}
                <Link
                  href="/contact"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Let us know
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
