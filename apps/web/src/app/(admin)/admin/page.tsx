'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ListChecks,
  ShieldAlert,
  Gauge,
  Clock,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import { Reveal } from '@/components/visual/reveal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/api/client';
import type {
  AdminDispute,
  AdminDisputesResponse,
  MiddlemanQueueResponse,
  NextAction,
  QueueItem,
} from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';

function useQueue(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-queue'],
    enabled,
    queryFn: async () => apiRequest<MiddlemanQueueResponse>('/admin/queue'),
  });
}

function useDisputes(enabled: boolean) {
  return useQuery({
    queryKey: ['admin-disputes'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<AdminDisputesResponse>('/admin/disputes');
      return res.disputes;
    },
  });
}

function formatCents(cents: string | null): string {
  if (cents === null) return '\u2014';
  const value = Number(cents);
  return Number.isFinite(value) ? formatUsdCents(value) : '\u2014';
}

function formatDate(value: string | null): string {
  if (!value) return '\u2014';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '\u2014' : date.toLocaleDateString();
}

function primaryAction(actions: NextAction[]): NextAction | undefined {
  return actions.find((action) => action.blocking) ?? actions[0];
}

function QueueTable({ items }: { items: QueueItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">No deals assigned to you.</p>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Next step</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const action = primaryAction(item.nextActions);
          return (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">
                <Link href={`/deals/${item.id}`} className="hover:underline">
                  {item.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={dealStatusVariant(item.status)}>
                  {dealStatusLabel(item.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatCents(item.dealAmountCents)}</TableCell>
              <TableCell>
                {item.riskScore === null ? (
                  '\u2014'
                ) : (
                  <Badge variant={item.riskScore >= 50 ? 'warning' : 'secondary'}>
                    {item.riskScore}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm">{action ? action.label : '\u2014'}</span>
                {item.waitingOnMiddleman ? (
                  <Badge variant="warning" className="ml-2">
                    Needs you
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/deals/${item.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DisputesTable({ disputes }: { disputes: AdminDispute[] }) {
  if (disputes.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No open disputes.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Opened</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {disputes.map((dispute) => (
          <TableRow key={dispute.id}>
            <TableCell className="font-mono text-xs">
              <Link href={`/admin/disputes/${dispute.dealId}`} className="hover:underline">
                {dispute.dealId.slice(0, 8)}
              </Link>
            </TableCell>
            <TableCell className="max-w-xs truncate">{dispute.reason ?? '\u2014'}</TableCell>
            <TableCell>
              <Badge variant="warning">{dealStatusLabel(dispute.status)}</Badge>
            </TableCell>
            <TableCell>{formatDate(dispute.createdAt)}</TableCell>
            <TableCell className="text-right">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/disputes/${dispute.dealId}`}>Review</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AdminConsolePage() {
  const router = useRouter();
  const { status } = useAuth();

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/admin');
    }
  }, [status, router]);

  const queueQuery = useQueue(status === 'authenticated');
  const disputesQuery = useDisputes(status === 'authenticated');

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const summary = queueQuery.data?.summary;
  const items = queueQuery.data?.items ?? [];
  const disputes = disputesQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Middleman console
        </h1>
        <p className="text-sm text-muted-foreground">
          Triage the deals assigned to you and the disputes that need a decision.
        </p>
      </div>

      {summary ? (
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary">Assigned: {summary.total}</Badge>
          <Badge variant="warning">Needs you: {summary.waiting}</Badge>
          <Badge variant="outline">On hold: {summary.onHold}</Badge>
          <Badge variant="destructive">Open disputes: {disputes.length}</Badge>
        </div>
      ) : null}

      <Reveal>
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              What this view shows
            </h2>
            <p className="text-sm text-muted-foreground">
              A quick orientation to keep your reconciliation and triage decisions consistent.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: ListChecks,
                title: 'Work queue',
                body: 'Deals assigned to you, ordered so the ones needing action surface first.',
              },
              {
                icon: ShieldAlert,
                title: 'Open disputes',
                body: 'Cases awaiting your review. Read both sides before issuing a decision.',
              },
              {
                icon: Gauge,
                title: 'Risk score',
                body: 'A signal, not a verdict. Higher scores deserve a closer look before release.',
              },
            ].map((card) => (
              <Card
                key={card.title}
                className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardHeader className="space-y-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                    <card.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription>{card.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Work queue</CardTitle>
          <CardDescription>Deals assigned to you, the ones needing action first.</CardDescription>
        </CardHeader>
        <CardContent>
          {queueQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : queueQuery.isError ? (
            <p className="text-sm text-destructive">
              Unable to load the queue. You may not have middleman access.
            </p>
          ) : (
            <QueueTable items={items} />
          )}
        </CardContent>
      </Card>

      <Card id="disputes" className="scroll-mt-20 rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Open disputes</CardTitle>
          <CardDescription>Disputes awaiting your review and decision.</CardDescription>
        </CardHeader>
        <CardContent>
          {disputesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : disputesQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load disputes. Please refresh.</p>
          ) : (
            <DisputesTable disputes={disputes} />
          )}
        </CardContent>
      </Card>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-primary" aria-hidden />
              Operator notes & legend
            </CardTitle>
            <CardDescription>
              Reference for the badges and signals used across both tables.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Status legend</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Badge variant="warning">Needs you</Badge>
                  Waiting on a middleman action before it can progress.
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="secondary">Risk &lt; 50</Badge>
                  Within normal range — proceed with standard checks.
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="warning">Risk ≥ 50</Badge>
                  Elevated — verify identity and funding source first.
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Triage tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Clear time-sensitive items first to avoid breaching deadlines.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Confirm both parties have met their obligations before releasing funds.
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Escalate anything unusual rather than forcing a decision under pressure.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
