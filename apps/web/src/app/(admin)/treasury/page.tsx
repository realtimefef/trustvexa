'use client';

/**
 * Operator treasury reconciliation panel (task 7.4). Shows the latest on-chain
 * vs. ledger balance per asset and flags mismatches. Lives under the (admin)
 * route group, which already gates access to the middleman role.
 */
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Scale, Link2, ShieldCheck, AlertTriangle, Info, RefreshCw } from 'lucide-react';

import { Reveal } from '@/components/visual/reveal';
import { Badge } from '@/components/ui/badge';
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
import type { TreasuryResponse } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';

function useTreasury(enabled: boolean) {
  return useQuery({
    queryKey: ['treasury'],
    enabled,
    queryFn: async () => apiRequest<TreasuryResponse>('/treasury'),
  });
}

export default function TreasuryPage() {
  const { status } = useAuth();
  const treasuryQuery = useTreasury(status === 'authenticated');

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const data = treasuryQuery.data;
  const lines = data?.lines ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Treasury reconciliation
        </h1>
        <p className="text-sm text-muted-foreground">
          Latest on-chain vs. ledger balance per asset. Investigate any mismatch before releasing
          funds.
        </p>
      </header>

      {data && data.mismatchCount > 0 ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {data.mismatchCount} asset{data.mismatchCount === 1 ? '' : 's'} need reconciliation.
        </div>
      ) : null}

      <Reveal>
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              What this view shows
            </h2>
            <p className="text-sm text-muted-foreground">
              Each row compares what the ledger expects against what the chain actually holds.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Scale,
                title: 'Ledger balance',
                body: 'The amount our books expect to be held for an asset, in smallest units.',
              },
              {
                icon: Link2,
                title: 'On-chain balance',
                body: 'The live balance observed on the network for the same asset and wallet.',
              },
              {
                icon: ShieldCheck,
                title: 'Delta & status',
                body: 'A non-zero delta flags a mismatch to investigate before releasing funds.',
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
          <CardTitle>Balances</CardTitle>
          <CardDescription>
            Amounts are smallest-unit integers exactly as recorded on the ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {treasuryQuery.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No treasury snapshots yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Ledger</TableHead>
                  <TableHead>On-chain</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={`${line.coin}-${line.network}`}>
                    <TableCell className="font-medium">
                      {line.coin} <span className="text-muted-foreground">{line.network}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{line.ledgerBalance}</TableCell>
                    <TableCell className="font-mono text-xs">{line.onchainBalance}</TableCell>
                    <TableCell className="font-mono text-xs">{line.deltaSmallestUnit}</TableCell>
                    <TableCell>
                      <Badge variant={line.mismatch ? 'warning' : 'outline'}>
                        {line.mismatch ? 'Mismatch' : 'Reconciled'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-primary" aria-hidden />
              Reconciliation notes & legend
            </CardTitle>
            <CardDescription>
              How to read the status column and what to do when balances diverge.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Status legend</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Badge variant="outline">Reconciled</Badge>
                  Ledger and on-chain balances agree — no action needed.
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="warning">Mismatch</Badge>
                  Balances diverge — pause releases for that asset and investigate.
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Operator guidance</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Snapshots refresh periodically; a brief delta can settle on the next sync.
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />A
                  persistent mismatch should be escalated before any payout is approved.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
