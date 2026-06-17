'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  LifeBuoy,
  MessageSquare,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  Split,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import type { DashboardResponse } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { formatUsdCents } from '@/lib/fees';

const MEDIATION_STEPS = [
  {
    icon: Gavel,
    title: 'A dispute is opened',
    body: 'Either party can raise a dispute from inside an active deal. Escrowed funds are frozen and stay protected while the case is reviewed.',
  },
  {
    icon: FileText,
    title: 'Both sides share evidence',
    body: 'Each party submits their account and supporting files. Clear, timestamped evidence helps the case resolve faster.',
  },
  {
    icon: Scale,
    title: 'A neutral middleman reviews',
    body: 'An impartial mediator weighs the agreed terms against the evidence — never taking sides before the facts are in.',
  },
  {
    icon: CheckCircle2,
    title: 'A fair outcome is applied',
    body: 'Funds are released, refunded, or split according to the decision, and the deal closes with a full record.',
  },
];

const EVIDENCE = [
  {
    icon: MessageSquare,
    title: 'Agreed terms & chat',
    body: 'The original scope and any messages where both sides agreed on what would be delivered.',
  },
  {
    icon: Camera,
    title: 'Screenshots & proof',
    body: 'Visual proof of the item, account access, or delivery state at the moment of handover.',
  },
  {
    icon: FileText,
    title: 'Delivery records',
    body: 'Transfer receipts, files, credentials, or anything documenting what actually changed hands.',
  },
  {
    icon: Clock,
    title: 'Timestamps',
    body: 'Dated records that show the sequence of events — when things were promised and delivered.',
  },
];

const OUTCOMES = [
  {
    icon: RotateCcw,
    title: 'Full refund',
    body: 'If delivery did not meet the agreed terms, the buyer is made whole and escrow returns to them in full.',
    accent: 'text-primary',
  },
  {
    icon: ShieldCheck,
    title: 'Full release',
    body: 'If the seller delivered as agreed, the escrowed funds are released to them and the deal completes.',
    accent: 'text-success',
  },
  {
    icon: Split,
    title: 'Partial split',
    body: 'When both sides are partly right, funds are divided proportionally to reflect what was actually delivered.',
    accent: 'text-warning',
  },
];

function useDeals(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-deals'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<DashboardResponse>('/dashboard');
      return res.deals;
    },
  });
}

function formatCents(cents: string | null): string {
  if (cents === null) return '$0.00';
  const value = Number(cents);
  return Number.isFinite(value) ? formatUsdCents(value) : '$0.00';
}

export default function DisputesPage() {
  const { status } = useAuth();

  const dealsQuery = useDeals(status === 'authenticated');
  const deals = dealsQuery.data ?? [];

  // Filter deals related to disputes
  const disputedDeals = React.useMemo(() => {
    return deals.filter((deal) => ['disputed', 'problem_raised'].includes(deal.status));
  }, [deals]);

  const resolvedDisputesCount = React.useMemo(() => {
    // We can count historically resolved ones, but as a mock/real blend:
    return deals.filter(
      (deal) => ['released', 'refunded'].includes(deal.status) && deal.holdStatus === 'disputed',
    ).length;
  }, [deals]);

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardPageHeader
        title="Disputes"
        description="Track disputes and let a neutral middleman resolve them fairly."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard
          icon={Gavel}
          label="Open disputes"
          value={disputedDeals.length}
          accent="warning"
        />
        <StatCard
          icon={Scale}
          label="In mediation"
          value={disputedDeals.filter((d) => d.status === 'disputed').length}
          accent="accent"
        />
        <StatCard
          icon={ShieldCheck}
          label="Resolved"
          value={resolvedDisputesCount}
          hint="Dispute closure rate"
          accent="success"
        />
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Your disputes</CardTitle>
          <CardDescription>
            Disputes are reviewed against the agreed terms and the evidence submitted by both sides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dealsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : disputedDeals.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              You don&apos;t have any active disputes at the moment.
            </div>
          ) : (
            disputedDeals.map((d) => {
              const dispStatus = d.status === 'problem_raised' ? 'Open' : 'In review';
              const variant = d.status === 'problem_raised' ? 'warning' : 'default';
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:shadow-glow bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Gavel className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm">DSP-{d.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        Deal <span className="font-mono">{d.id.slice(0, 8)}</span> · Role: {d.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCents(d.dealAmountCents)}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'}>
                      {dispStatus}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/deals/${d.id}`}>View deal</Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Disputes can only be opened from within an active deal. Open the deal detail page and
            choose “Open dispute” or “Raise problem” to start mediation.
          </div>
        </CardContent>
      </Card>

      <Reveal>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title="How mediation works"
            subtitle="A neutral, evidence-based process that keeps escrow safe until a fair decision is reached."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MEDIATION_STEPS.map((step, i) => (
              <Card
                key={step.title}
                className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl font-bold text-muted-foreground/40">
                      0{i + 1}
                    </span>
                  </div>
                  <CardTitle className="mt-3 font-display text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="Be prepared"
            title="What evidence helps"
            subtitle="Strong, clear evidence makes a dispute faster and easier to resolve in your favour."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EVIDENCE.map((item) => (
              <Card
                key={item.title}
                className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="space-y-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="Outcomes"
            title="Possible outcomes"
            subtitle="Every case ends in one of three fair resolutions, decided strictly on the evidence."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {OUTCOMES.map((item) => (
              <Card
                key={item.title}
                className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="space-y-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                    <item.icon className={`h-5 w-5 ${item.accent}`} />
                  </span>
                  <p className="font-display font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={140}>
        <Card className="rounded-2xl border bg-brand-gradient text-white shadow-soft">
          <CardContent className="flex flex-col gap-4 p-8 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <p className="font-display text-xl font-bold">Your funds stay protected</p>
              <p className="text-sm text-white/80">
                The moment a dispute opens, escrow is frozen. Nothing moves until a neutral mediator
                reaches a decision based on the agreed terms — so neither side can act unilaterally.
              </p>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={160}>
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </span>
                <p className="font-medium">Start a protected deal</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/deals/new">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <p className="font-medium">How escrow works</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/how-it-works">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
            <CardContent className="flex items-center justify-between gap-3 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LifeBuoy className="h-5 w-5" />
                </span>
                <p className="font-medium">Contact support</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/support">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  );
}
