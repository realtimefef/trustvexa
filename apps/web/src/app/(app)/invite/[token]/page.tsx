'use client';

/**
 * Invite acceptance page. Logged-in users preview and accept a deal invite.
 * Unauthenticated users are redirected to /login by middleware.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { formatUsdCents } from '@/lib/fees';
import { useAuth } from '@/lib/auth/auth-context';

interface InvitePreview {
  dealId: string;
  status: string;
  coin: string;
  network: string;
  dealAmountCents: number | null;
  counterparty: {
    accountLabel: string | null;
    completedDeals: number | null;
    disputeRateBand: string | null;
    riskWarning: string | null;
  } | null;
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const router = useRouter();
  const { status } = useAuth();

  const [preview, setPreview] = React.useState<InvitePreview | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [acceptError, setAcceptError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(false);
  const [acceptedDealId, setAcceptedDealId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status !== 'authenticated') return;

    async function loadPreview() {
      setIsLoading(true);
      setPreviewError(null);
      try {
        const result = await apiRequest<InvitePreview>('/invites/preview', {
          method: 'POST',
          body: { token },
        });
        setPreview(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'This invite link is invalid or expired.';
        setPreviewError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPreview();
  }, [status, token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const result = await apiRequest<{ dealId: string; status: string }>('/invites/accept', {
        method: 'POST',
        body: { token },
        idempotencyKey: newIdempotencyKey(),
      });
      setAccepted(true);
      setAcceptedDealId(result.dealId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept invite. Please try again.';
      setAcceptError(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  if (status !== 'authenticated' || isLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-12">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (accepted && acceptedDealId) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              You&apos;ve joined the deal!
            </CardTitle>
            <CardDescription>
              You are now a participant in this escrow deal. Fund the escrow to start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push(`/deals/${acceptedDealId}`)}>
              View deal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="mx-auto max-w-lg py-12 space-y-4">
        <h1 className="text-xl font-bold">Deal Invite</h1>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Invite not available</CardTitle>
            <CardDescription>{previewError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview) return null;

  const amountStr =
    preview.dealAmountCents !== null ? formatUsdCents(preview.dealAmountCents) : '—';

  return (
    <div className="mx-auto max-w-lg py-12 space-y-6">
      <h1 className="text-xl font-bold">Deal Invite</h1>
      <p className="text-sm text-muted-foreground">
        You have been invited to join an escrow deal as the buyer. Review the details below before
        accepting.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deal ID</span>
            <span className="font-mono">{preview.dealId.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{amountStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coin / Network</span>
            <span className="font-medium">
              {preview.coin} · {preview.network}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{preview.status}</span>
          </div>
        </CardContent>
      </Card>

      {preview.counterparty && (
        <Card className={preview.counterparty.riskWarning ? 'border-amber-500/30' : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {preview.counterparty.riskWarning && (
                <ShieldAlert className="h-4 w-4 text-amber-500" />
              )}
              Seller info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account type</span>
              <span className="font-medium capitalize">
                {preview.counterparty.accountLabel ?? 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed deals</span>
              <span className="font-medium">
                {preview.counterparty.completedDeals ?? '—'}
              </span>
            </div>
            {preview.counterparty.riskWarning && (
              <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {preview.counterparty.riskWarning}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {acceptError && (
        <p className="text-sm text-destructive">{acceptError}</p>
      )}

      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard">Decline</Link>
        </Button>
        <Button className="flex-1" onClick={handleAccept} disabled={isAccepting}>
          {isAccepting ? 'Accepting…' : 'Accept & join deal'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        By accepting you agree to the deal terms and TrustVexa&apos;s escrow policy. This invite
        link is single-use and will be invalidated after acceptance.
      </p>
    </div>
  );
}
