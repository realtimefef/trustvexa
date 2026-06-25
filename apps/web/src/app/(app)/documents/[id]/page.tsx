'use client';

/**
 * Deal document detail viewer — FE-CRIT-3 FIX.
 *
 * This page was linked from /documents but did not exist, causing a 404 for
 * every "View in browser" click. It renders a full deal summary with all
 * associated documents: deal agreement, receipt (settled deals), and dispute
 * decision (dispute-resolved deals).
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  FileCheck,
  FileText,
  Gavel,
  Receipt,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, getAccessToken } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant, roleLabel } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';
import type { DealDetail } from '@/lib/api/types';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const SETTLED_STATES = new Set(['Released', 'Refunded', 'PartiallySettled']);
const DISPUTE_DECISION_STATES = new Set(['Refunded', 'PartiallySettled']);

async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right font-medium">{value}</span>
    </div>
  );
}

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const dealId = params?.id ?? '';
  const { status } = useAuth();
  const [downloading, setDownloading] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/documents');
  }, [status, router]);

  const dealQuery = useQuery({
    queryKey: ['deal-detail', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: async () => apiRequest<DealDetail>(`/deals/${dealId}`),
  });

  const run = (key: string, path: string, filename: string) => {
    setDownloading(key);
    void downloadFile(path, filename).finally(() => setDownloading(null));
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const deal = dealQuery.data;
  const shortId = dealId.slice(0, 8);
  const isSettled = deal ? SETTLED_STATES.has(deal.status) : false;
  const hasDecision = deal ? DISPUTE_DECISION_STATES.has(deal.status) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" /> Back to documents
          </Link>
        </Button>
      </div>

      {dealQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : dealQuery.isError ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-destructive text-sm">Unable to load deal. You may not have access.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/documents">Back to documents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : !deal ? null : (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Deal <span className="font-mono">{shortId}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{deal.coin} on {deal.network}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge>
              <Badge variant="outline">{roleLabel(deal.role)}</Badge>
            </div>
          </div>

          {/* Deal summary */}
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-4 w-4 text-primary" />
                Deal summary
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow
                label="Deal ID"
                value={<span className="font-mono text-xs break-all">{dealId}</span>}
              />
              <InfoRow label="Status" value={dealStatusLabel(deal.status)} />
              <InfoRow label="Your role" value={roleLabel(deal.role)} />
              {deal.dealAmountCents ? (
                <InfoRow
                  label="Deal amount"
                  value={formatUsdCents(Number(deal.dealAmountCents))}
                />
              ) : null}
              <InfoRow label="Coin / Network" value={`${deal.coin} on ${deal.network}`} />
              {deal.feePayer ? (
                <InfoRow label="Fee payer" value={deal.feePayer} />
              ) : null}
              {deal.createdAt ? (
                <InfoRow
                  label="Created"
                  value={new Date(deal.createdAt).toLocaleDateString()}
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Security notice */}
          <Card className="rounded-2xl border bg-muted/30 shadow-soft">
            <CardContent className="flex items-start gap-3 p-5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                Documents are downloaded over an authenticated connection and served directly from
                the TrustVexa API. They are generated on demand and are not stored in your browser.
              </p>
            </CardContent>
          </Card>

          {/* Document downloads */}
          <Card className="rounded-2xl shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Available documents</CardTitle>
              <CardDescription>
                Click any document to download it. Settlement receipts and dispute decisions unlock
                once the deal reaches its final state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Deal Agreement — always available */}
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Deal Agreement</p>
                    <p className="text-xs text-muted-foreground">
                      Locked terms accepted by both parties
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloading !== null}
                  onClick={() =>
                    run(
                      'agreement',
                      `/documents/deals/${dealId}/agreement.pdf`,
                      `deal-agreement-${shortId}.pdf`,
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloading === 'agreement' ? 'Preparing…' : 'Download PDF'}
                </Button>
              </div>

              {/* Settlement Receipt — settled deals only */}
              <div
                className={`flex items-center justify-between rounded-xl border p-4 ${!isSettled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${isSettled ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-muted text-muted-foreground'}`}
                  >
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Settlement Receipt</p>
                    <p className="text-xs text-muted-foreground">
                      {isSettled ? 'Proof of settlement including fees' : 'Available once deal settles'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isSettled || downloading !== null}
                  onClick={() =>
                    run('receipt', `/documents/deals/${dealId}/receipt.pdf`, `receipt-${shortId}.pdf`)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloading === 'receipt' ? 'Preparing…' : isSettled ? 'Download PDF' : 'Locked'}
                </Button>
              </div>

              {/* Dispute Decision — dispute-resolved deals only */}
              <div
                className={`flex items-center justify-between rounded-xl border p-4 ${!hasDecision ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${hasDecision ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' : 'bg-muted text-muted-foreground'}`}
                  >
                    <Gavel className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Dispute Decision</p>
                    <p className="text-xs text-muted-foreground">
                      {hasDecision
                        ? 'Middleman decision and settlement breakdown'
                        : 'Available for dispute-resolved deals only'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasDecision || downloading !== null}
                  onClick={() =>
                    run(
                      'decision',
                      `/documents/deals/${dealId}/dispute-decision.pdf`,
                      `dispute-decision-${shortId}.pdf`,
                    )
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloading === 'decision'
                    ? 'Preparing…'
                    : hasDecision
                      ? 'Download PDF'
                      : 'Locked'}
                </Button>
              </div>

              <hr className="my-1 border-border" />

              {/* View in Deals */}
              <div className="flex justify-end pt-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/deals/${dealId}`}>Open deal room →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
