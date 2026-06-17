'use client';

/**
 * Referral program (Project Plan §12). Shows the caller's shareable referral
 * code and the people they've referred (`GET /referrals`), lets them create
 * their code on demand (`POST /referrals`, idempotent get-or-create), and copy
 * the code to the clipboard. Uses TanStack Query for the read and an idempotent
 * mutation for the create.
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Gift, Share2, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface ReferralView {
  id: string;
  code: string;
  invitedEmailHash: string | null;
  status: string | null;
  createdAt: string;
}

interface ReferralListView {
  code: string | null;
  referrals: ReferralView[];
}

interface ReferralCodeView {
  id: string;
  code: string;
  status: string | null;
  createdAt: string;
}

function statusVariant(status: string | null): 'success' | 'warning' | 'secondary' | 'outline' {
  switch (status) {
    case 'joined':
      return 'success';
    case 'sent':
      return 'warning';
    case 'expired':
      return 'secondary';
    default:
      return 'outline';
  }
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString();
}

function useReferrals(enabled: boolean) {
  return useQuery({
    queryKey: ['referrals'],
    enabled,
    queryFn: async () => apiRequest<ReferralListView>('/referrals'),
  });
}

export default function ReferralsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/referrals');
    }
  }, [status, router]);

  const referralsQuery = useReferrals(status === 'authenticated');

  const createMutation = useMutation({
    mutationFn: async () =>
      apiRequest<ReferralCodeView>('/referrals', {
        method: 'POST',
        body: {},
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const code = referralsQuery.data?.code ?? null;
  const referrals = (referralsQuery.data?.referrals ?? []).filter(
    (r) => r.invitedEmailHash !== null,
  );

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        title="Referral program"
        description="Share your code and track who joins TrustVexa through you."
      />

      <Card className="rounded-2xl border bg-brand-gradient text-white shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Gift className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="font-display text-xl">Your referral code</CardTitle>
              <CardDescription className="text-white/80">
                Invite traders to TrustVexa with your personal code.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {referralsQuery.isLoading ? (
            <Skeleton className="h-11 w-full rounded-xl bg-white/20" />
          ) : referralsQuery.isError ? (
            <p className="text-sm text-white/90">Unable to load your referral details.</p>
          ) : code ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-white/15 px-4 py-2 font-mono text-lg tracking-widest">
                {code}
              </span>
              <Button variant="secondary" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/90">
                You don&apos;t have a referral code yet. Create one to start inviting.
              </p>
              <Button
                variant="secondary"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Share2 className="h-4 w-4" />
                {createMutation.isPending ? 'Creating\u2026' : 'Create my code'}
              </Button>
              {createMutation.isError ? (
                <p className="text-sm text-white/90">Could not create a code. Please try again.</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" /> Your referrals
          </CardTitle>
          <CardDescription>
            People you&apos;ve invited and where they are in the journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : referralsQuery.isError ? (
            <p className="text-sm text-destructive">
              Unable to load your referrals. Please refresh.
            </p>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No referrals yet. Share your code to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {referrals.map((referral) => (
                <li key={referral.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="space-y-0.5">
                    <p className="font-mono text-sm">{referral.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited {formatDate(referral.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusVariant(referral.status)}>
                    {referral.status ?? 'pending'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardContent className="flex items-start gap-3 p-6">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Your referral code is for sharing publicly. It is separate from the secure, expiring
              invite links you use to bring a specific counterparty into a single deal.
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
