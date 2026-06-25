'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileCheck,
  HelpCircle,
  ListChecks,
  Lock,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';
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
import type { DashboardResponse } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { formatUsdCents } from '@/lib/fees';
import { cn } from '@/lib/utils';

type Txn = {
  id: string;
  type: 'Deposit' | 'Release' | 'Refund' | 'Fee' | 'Withdrawal';
  deal: string;
  coin: string;
  amount: string;
  status: 'Completed' | 'Pending' | 'Failed';
  date: string;
  rawDate: Date;
};

const statusVariant = (s: Txn['status']) =>
  s === 'Completed' ? 'success' : s === 'Pending' ? 'warning' : 'destructive';

const TYPE_LEGEND = [
  {
    icon: ArrowDownLeft,
    type: 'Deposit',
    body: 'Funds a buyer moves into escrow at the start of a deal. Shows as a credit once the network confirms it.',
  },
  {
    icon: ShieldCheck,
    type: 'Release',
    body: 'Escrowed funds paid out to the seller after delivery is approved. This is the successful close of a deal.',
  },
  {
    icon: RefreshCw,
    type: 'Refund',
    body: 'Escrowed funds returned to the buyer, for example after a cancellation or a dispute resolved in their favour.',
  },
  {
    icon: Receipt,
    type: 'Fee',
    body: 'The platform fee applied to a completed deal. It is itemised separately so your records stay transparent.',
  },
  {
    icon: ArrowUpRight,
    type: 'Withdrawal',
    body: 'Available balance you send from your account to an external address. Appears as a debit on settlement.',
  },
];

const TXN_FAQS = [
  {
    q: 'Why do I see a separate fee line?',
    a: 'Fees are itemised rather than bundled into the deal amount so every charge is visible and easy to reconcile.',
  },
  {
    q: 'What does a Pending status mean?',
    a: 'The entry has been recorded but is still awaiting network confirmation or an approval step. It updates automatically.',
  },
  {
    q: 'Can I export this history?',
    a: 'Yes. Use Export CSV to download a complete record you can hand to your accountant or import into a spreadsheet.',
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
  if (cents === null) return '0.00';
  const value = Number(cents);
  return Number.isFinite(value) ? formatUsdCents(value) : '0.00';
}

export default function TransactionsPage() {
  const { status } = useAuth();
  const [query, setQuery] = React.useState('');

  const dealsQuery = useDeals(status === 'authenticated');
  const deals = dealsQuery.data ?? [];

  // Derive transactions from deals
  const txns = React.useMemo(() => {
    const list: Txn[] = [];
    deals.forEach((deal) => {
      // Inflow for buyer: Deposit into escrow
      if (deal.role === 'buyer' && ['funded', 'in_inspection', 'released'].includes(deal.status)) {
        list.push({
          id: `DEP-${deal.id.slice(0, 8)}`,
          type: 'Deposit',
          deal: `Fund escrow for Deal ${deal.id.slice(0, 8)}`,
          coin: deal.coin,
          amount: `+${formatCents(deal.dealAmountCents)}`,
          status: 'Completed',
          date: new Date(deal.createdAt).toLocaleDateString(),
          rawDate: new Date(deal.createdAt),
        });
      }

      // Inflow for seller: Release of escrow funds
      if (deal.role === 'seller' && deal.status === 'released') {
        list.push({
          id: `REL-${deal.id.slice(0, 8)}`,
          type: 'Release',
          deal: `Escrow release payout for Deal ${deal.id.slice(0, 8)}`,
          coin: deal.coin,
          amount: `+${formatCents(deal.sellerPayoutCents)}`,
          status: 'Completed',
          date: new Date(deal.updatedAt || deal.createdAt).toLocaleDateString(),
          rawDate: new Date(deal.updatedAt || deal.createdAt),
        });
      }

      // Outflow for buyer/seller: Platform fees
      if (deal.status === 'released') {
        const isBuyerFee = deal.role === 'buyer' && deal.feePayer === 'buyer';
        const isSellerFee = deal.role === 'seller' && deal.feePayer === 'seller';
        if (isBuyerFee || isSellerFee) {
          const feeCents = Math.abs(
            Number(deal.buyerTotalCents || 0) - Number(deal.dealAmountCents || 0),
          );
          if (feeCents > 0) {
            list.push({
              id: `FEE-${deal.id.slice(0, 8)}`,
              type: 'Fee',
              deal: `Platform fee for Deal ${deal.id.slice(0, 8)}`,
              coin: deal.coin,
              amount: `-${formatCents(String(feeCents))}`,
              status: 'Completed',
              date: new Date(deal.updatedAt || deal.createdAt).toLocaleDateString(),
              rawDate: new Date(deal.updatedAt || deal.createdAt),
            });
          }
        }
      }

      // Refund to buyer
      if (deal.role === 'buyer' && deal.status === 'refunded') {
        list.push({
          id: `REF-${deal.id.slice(0, 8)}`,
          type: 'Refund',
          deal: `Escrow refund for Deal ${deal.id.slice(0, 8)}`,
          coin: deal.coin,
          amount: `+${formatCents(deal.buyerTotalCents)}`,
          status: 'Completed',
          date: new Date(deal.updatedAt || deal.createdAt).toLocaleDateString(),
          rawDate: new Date(deal.updatedAt || deal.createdAt),
        });
      }
    });

    // Sort newest first
    return list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
  }, [deals]);

  const filtered = txns.filter(
    (t) =>
      t.id.toLowerCase().includes(query.toLowerCase()) ||
      t.deal.toLowerCase().includes(query.toLowerCase()) ||
      t.type.toLowerCase().includes(query.toLowerCase()),
  );

  const inflowCount = txns.filter((t) => t.amount.startsWith('+')).length;
  const outflowCount = txns.filter((t) => t.amount.startsWith('-') && t.type !== 'Fee').length;
  const feeCount = txns.filter((t) => t.type === 'Fee').length;
  const completedCount = txns.filter((t) => t.status === 'Completed').length;

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <DashboardPageHeader
        title="Transactions"
        description="A complete, auditable history of every movement on your account."
        action={
          <Button variant="outline">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ArrowDownLeft}
          label="Inflows"
          value={inflowCount}
          hint="Deposits & releases"
          accent="success"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Outflows"
          value={outflowCount}
          hint="Withdrawals"
          accent="accent"
        />
        <StatCard
          icon={Receipt}
          label="Fee entries"
          value={feeCount}
          hint="Itemised platform fees"
          accent="warning"
        />
        <StatCard
          icon={ListChecks}
          label="Completed"
          value={completedCount}
          hint={`of ${txns.length} records`}
          accent="primary"
        />
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by ID, deal, or type…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {dealsQuery.isLoading ? (
            <div className="p-8 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Deal</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const isCredit = t.amount.startsWith('+');
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <span
                            className={cn(
                              'flex h-7 w-7 items-center justify-center rounded-lg',
                              isCredit
                                ? 'bg-success/15 text-success'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </span>
                          {t.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.id}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.deal}</TableCell>
                      <TableCell className={cn('font-medium', isCredit ? 'text-success' : '')}>
                        {t.amount} {t.coin}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {t.date}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {filtered.length === 0 && !dealsQuery.isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No transactions found.</p>
          ) : null}
        </CardContent>
      </Card>

      <Reveal>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="Legend"
            title="Understanding your transactions"
            subtitle="Every entry is one of five types. Here is what each one means for your balance."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TYPE_LEGEND.map((item) => (
              <Card
                key={item.type}
                className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <p className="font-display font-semibold">{item.type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={80}>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileCheck className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <p className="font-display font-semibold">Built for clean audits</p>
              <p className="text-sm text-muted-foreground">
                Each record carries a unique reference, a timestamp, and a status, so your history
                reconciles line-by-line. Export a CSV any time to share a tamper-evident trail with
                your accountant or for your own bookkeeping.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" /> Immutable references
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Status on every entry
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={120}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Transaction questions"
            subtitle="The details people most often want to confirm about their records."
          />
          <div className="grid gap-4 md:grid-cols-3">
            {TXN_FAQS.map((item) => (
              <Card key={item.q} className="rounded-2xl border bg-card shadow-soft">
                <CardContent className="space-y-2 p-6">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="font-medium">{item.q}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
