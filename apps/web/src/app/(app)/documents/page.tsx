'use client';

/**
 * Document center (Project Plan §12). Lists the caller's deals (from
 * `GET /dashboard`) and, per deal, offers authenticated PDF downloads:
 *   - the locked deal agreement (any party),
 *   - a settlement receipt (settled deals),
 *   - the dispute-decision document (deals resolved via dispute).
 * A top-level action exports all of the caller's own data as JSON
 * (`GET /documents/me/export`). Downloads use an authenticated fetch + Blob
 * helper mirroring the deal-detail page.
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, FolderArchive, ShieldCheck, Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { apiRequest, getAccessToken } from '@/lib/api/client';
import type { DashboardResponse, DealSummary } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant, roleLabel } from '@/lib/deal-status';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const SETTLED_STATES = new Set(['Released', 'Refunded', 'PartiallySettled']);
const DISPUTE_DECISION_STATES = new Set(['Refunded', 'PartiallySettled']);

/** Download an authenticated file via fetch + a temporary object URL. */
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

function useDeals(enabled: boolean) {
  return useQuery({
    queryKey: ['documents-deals'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<DashboardResponse>('/dashboard');
      return res.deals;
    },
  });
}

function DealDocuments({ deal }: { deal: DealSummary }) {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const shortId = deal.id.slice(0, 8);

  const run = (key: string, path: string, filename: string) => {
    setDownloading(key);
    void downloadFile(path, filename).finally(() => setDownloading(null));
  };

  const isSettled = SETTLED_STATES.has(deal.status);
  const hasDecision = DISPUTE_DECISION_STATES.has(deal.status);

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-base">
            <Link href={`/deals/${deal.id}`} className="hover:underline">
              Deal {shortId}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={dealStatusVariant(deal.status)}>{dealStatusLabel(deal.status)}</Badge>
            <Badge variant="outline">{roleLabel(deal.role)}</Badge>
          </div>
        </div>
        <CardDescription>
          {deal.coin} · {deal.network}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild variant="gradient" className="shadow-soft">
          <Link href={`/documents/${deal.id}`}>
            <Eye className="h-4 w-4 mr-1.5" />
            View in browser
          </Link>
        </Button>
        <Button
          variant="outline"
          disabled={downloading !== null}
          onClick={() =>
            run(
              'agreement',
              `/documents/deals/${deal.id}/agreement.pdf`,
              `deal-agreement-${shortId}.pdf`,
            )
          }
        >
          <FileText className="h-4 w-4" />
          {downloading === 'agreement' ? 'Preparing…' : 'Agreement PDF'}
        </Button>

        {isSettled ? (
          <Button
            variant="outline"
            disabled={downloading !== null}
            onClick={() =>
              run('receipt', `/documents/deals/${deal.id}/receipt.pdf`, `receipt-${shortId}.pdf`)
            }
          >
            <FileText className="h-4 w-4" />
            {downloading === 'receipt' ? 'Preparing…' : 'Receipt PDF'}
          </Button>
        ) : null}

        {hasDecision ? (
          <Button
            variant="outline"
            disabled={downloading !== null}
            onClick={() =>
              run(
                'decision',
                `/documents/deals/${deal.id}/dispute-decision.pdf`,
                `dispute-decision-${shortId}.pdf`,
              )
            }
          >
            <FileText className="h-4 w-4" />
            {downloading === 'decision' ? 'Preparing…' : 'Dispute decision PDF'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/documents');
    }
  }, [status, router]);

  const dealsQuery = useDeals(status === 'authenticated');

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const deals = dealsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <DashboardPageHeader
        title="Document center"
        description="Download signed agreements, receipts, and dispute decisions for your deals."
        action={
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => {
              setExporting(true);
              void downloadFile('/documents/me/export', 'trustvexa-my-data.json').finally(() =>
                setExporting(false),
              );
            }}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Preparing…' : 'Download my data (JSON)'}
          </Button>
        }
      />

      <Card className="rounded-2xl border bg-muted/30 shadow-soft">
        <CardContent className="flex items-start gap-3 p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground">
            Documents are generated on demand and downloaded over an authenticated connection.
            Receipts unlock once a deal settles, and a dispute-decision PDF is available for deals
            resolved through a dispute.
          </p>
        </CardContent>
      </Card>

      {dealsQuery.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : dealsQuery.isError ? (
        <p className="text-sm text-destructive">Unable to load your deals. Please refresh.</p>
      ) : deals.length === 0 ? (
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FolderArchive className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              You have no deals yet, so there are no documents to download.
            </p>
            <Button asChild variant="outline">
              <Link href="/deals/new">Start a deal</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {deals.map((deal) => (
            <DealDocuments key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      <Reveal>
        <Card className="rounded-2xl border bg-card shadow-soft">
          <CardContent className="flex items-start gap-3 p-6">
            <FolderArchive className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              The data export bundles your account information and deal records into a single JSON
              file you can keep for your own records or hand to your accountant.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
