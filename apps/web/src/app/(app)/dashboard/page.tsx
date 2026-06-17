'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  Gavel,
  Handshake,
  LifeBuoy,
  LogIn,
  MessageCircle,
  Phone,
  Plus,
  Star,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { StatCard } from '@/components/visual/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiRequest } from '@/lib/api/client';
import type { DashboardResponse, DealDraft, DealSummary, NextAction } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import { dealStatusLabel, dealStatusVariant, roleLabel } from '@/lib/deal-status';
import { formatUsdCents } from '@/lib/fees';
import { cn } from '@/lib/utils';

function useDrafts(enabled: boolean) {
  return useQuery({
    queryKey: ['deal-drafts'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<{ drafts?: DealDraft[] } | DealDraft[]>('/deals/drafts');
      return Array.isArray(res) ? res : (res.drafts ?? []);
    },
  });
}

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

function useConnections(enabled: boolean) {
  return useQuery({
    queryKey: ['connections'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<{
        connections: Array<{
          id: string;
          code: string;
          creatorUsername: string | null;
          joinerUsername: string | null;
          joined: boolean;
          dealId: string | null;
          createdAt: string;
        }>;
      }>('/connections');
      return res.connections;
    },
  });
}

/** Format an integer-cent string as USD, or an em dash when missing/invalid. */
function formatCents(cents: string | null): string {
  if (cents === null) return '\u2014';
  const value = Number(cents);
  return Number.isFinite(value) ? formatUsdCents(value) : '\u2014';
}

/** The single most relevant next action: the first blocking one, else the first. */
function primaryAction(actions: NextAction[]): NextAction | undefined {
  return actions.find((action) => action.blocking) ?? actions[0];
}

function ActiveDeals({ deals }: { deals: DealSummary[] }) {
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">You aren&apos;t part of any deals yet.</p>
        <Button asChild variant="outline">
          <Link href="/deals/new">Start a deal</Link>
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Deal</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Next step</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {deals.map((deal) => {
          const action = primaryAction(deal.nextActions);
          return (
            <TableRow key={deal.id}>
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Link href={`/deals/${deal.id}`} className="hover:underline">
                    {deal.id.slice(0, 8)}
                  </Link>
                </div>
                {deal.tags && deal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {deal.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary border border-primary/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell>{roleLabel(deal.role)}</TableCell>
              <TableCell>
                <Badge variant={dealStatusVariant(deal.status)}>
                  {dealStatusLabel(deal.status)}
                </Badge>
              </TableCell>
              <TableCell>{formatCents(deal.dealAmountCents)}</TableCell>
              <TableCell>
                <span className="text-sm">{action ? action.label : '\u2014'}</span>
                {deal.waitingOnYou ? (
                  <Badge variant="warning" className="ml-2">
                    Your move
                  </Badge>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/deals/${deal.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function JoinChatWidget() {
  const [code, setCode] = React.useState('');
  const router = useRouter();
  return (
    <form
      className="flex items-center gap-2 max-w-xs"
      onSubmit={e => { e.preventDefault(); const t = code.trim().toUpperCase(); if (t) router.push('/connect?join=' + t); }}
    >
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        maxLength={8}
        placeholder="Join code…"
        className="flex-1 h-8 rounded-lg bg-white/20 border border-white/30 text-white placeholder:text-white/50 px-3 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-white/40"
      />
      <button type="submit" disabled={!code.trim()}
        className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors disabled:opacity-40">
        <LogIn className="h-4 w-4" />
      </button>
    </form>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { status, user } = useAuth();

  // FE-CRIT-1 FIX: ALL hooks must be called unconditionally before any early return.
  // Moved useState and useMemo above the conditional return to satisfy React's
  // Rules of Hooks — previously these were called AFTER the early return which
  // causes a runtime crash on auth state transitions.
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);

  const dealsQuery = useDeals(status === 'authenticated');
  const draftsQuery = useDrafts(status === 'authenticated');
  const connectionsQuery = useConnections(status === 'authenticated');

  const deals = dealsQuery.data ?? [];
  const drafts = draftsQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];

  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    deals.forEach((d) => d.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [deals]);

  const filteredDeals = React.useMemo(() => {
    if (!selectedTag) return deals;
    return deals.filter((d) => d.tags?.includes(selectedTag));
  }, [deals, selectedTag]);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/dashboard');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const activeCount = deals.filter(
    (d) => !['released', 'refunded', 'cancelled'].includes(d.status),
  ).length;
  const waitingCount = deals.filter((d) => d.waitingOnYou).length;
  const totalValue = deals.reduce((sum, d) => {
    const v = d.dealAmountCents ? Number(d.dealAmountCents) : 0;
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl border bg-brand-gradient p-8 text-white shadow-glow-lg md:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              Welcome back{user?.username ? `, ${user.username}` : ''} 👋
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Here’s what’s happening with your escrow deals today.
            </p>
            {user?.id && (
              <p className="mt-1.5 text-xs text-white/60">
                Your ID:{' '}
                <span className="font-mono bg-white/10 rounded px-1.5 py-0.5 text-white/90 select-all">
                  {user.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link href="/contact">
                <Phone className="h-4 w-4 mr-1" aria-hidden="true" /> Contact Us
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link href="/connect">
                <Handshake className="h-4 w-4 mr-1" aria-hidden="true" /> Connect &amp; Chat
              </Link>
            </Button>
          </div>
          <div className="relative mt-3">
            <JoinChatWidget />
          </div>
        </div>
      </div>

      <OnboardingChecklist enabled={status === 'authenticated'} />

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Total in escrow"
          value={formatCents(String(totalValue))}
          accent="primary"
        />
        <StatCard icon={Clock} label="Active deals" value={activeCount} accent="accent" />
        <StatCard
          icon={CheckCircle2}
          label="Awaiting you"
          value={waitingCount}
          hint={waitingCount > 0 ? 'Action needed' : 'All caught up'}
          accent={waitingCount > 0 ? 'warning' : 'success'}
        />
        <StatCard icon={Plus} label="Open drafts" value={drafts.length} accent="success" />
      </div>

      {/* Connections — pre-deal chats */}
      {connections.length > 0 ? (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4 text-primary" aria-hidden />
              Active conversations
            </CardTitle>
            <CardDescription>
              Pre-deal chats. Continue a conversation or create a deal from it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {connections.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                    <p className="text-sm">
                      {c.creatorUsername}
                      {c.joinerUsername ? ` ↔ ${c.joinerUsername}` : ' — waiting for other party'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/connect?open=${c.id}`}>Chat</Link>
                    </Button>
                    {c.joined && !c.dealId ? (
                      <Button asChild variant="gradient" size="sm">
                        <Link href={`/deals/new?connection=${c.id}`}>Create deal</Link>
                      </Button>
                    ) : c.dealId ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/deals/${c.dealId}`}>View deal</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {connections.length > 5 ? (
              <Button asChild variant="ghost" size="sm" className="mt-2">
                <Link href="/connect">See all {connections.length} connections</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/connect', label: 'Connect & Chat', desc: 'Talk before the deal', icon: Handshake },
          { href: '/calculator', label: 'Fee calculator', desc: 'Estimate fees', icon: Calculator },
          { href: '/reviews', label: 'Reviews', desc: 'What traders say', icon: Star },
          { href: '/contact', label: 'Contact Us', desc: 'Get help fast', icon: LifeBuoy },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
              <a.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{a.label}</p>
              <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
            </div>
            <ArrowRight
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Your deals</CardTitle>
          <CardDescription>Active and past escrow deals you&apos;re a party to.</CardDescription>
        </CardHeader>
        <CardContent>
          {dealsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : dealsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load your deals. Please refresh.</p>
          ) : (
            <div className="space-y-4">
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border-b pb-4">
                  <span className="text-xs text-muted-foreground mr-2 font-medium">
                    Filter by tag:
                  </span>
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                      !selectedTag
                        ? 'bg-primary text-primary-foreground border-transparent font-semibold shadow-sm'
                        : 'bg-muted/40 border-border/40 hover:bg-muted text-muted-foreground',
                    )}
                  >
                    All
                  </button>
                  {allTags.map((tag) => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(isSelected ? null : tag)}
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-transparent font-semibold shadow-sm'
                            : 'bg-muted/40 border-border/40 hover:bg-muted text-muted-foreground',
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
              <ActiveDeals deals={filteredDeals} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Draft deals</CardTitle>
          <CardDescription>Deals you started but haven&apos;t opened yet.</CardDescription>
        </CardHeader>
        <CardContent>
          {draftsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : draftsQuery.isError ? (
            <p className="text-sm text-destructive">Unable to load drafts. Please refresh.</p>
          ) : drafts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">You don&apos;t have any drafts yet.</p>
              <Button asChild variant="outline">
                <Link href="/deals/new">Start your first deal</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Draft</TableHead>
                  <TableHead>Last step</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell className="font-mono text-xs">{draft.id.slice(0, 8)}</TableCell>
                    <TableCell>{draft.last_step ?? '\u2014'}</TableCell>
                    <TableCell>
                      {draft.updated_at
                        ? new Date(draft.updated_at).toLocaleDateString()
                        : '\u2014'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/deals/new?draft=${draft.id}`}>Resume</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tips & resources */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: CheckCircle2,
            title: 'Trade safely',
            body: 'Only release once you have inspected and confirmed the delivery.',
            href: '/how-it-works',
            cta: 'How it works',
          },
          {
            icon: Gavel,
            title: 'Disputes',
            body: 'If something goes wrong, open a dispute and a middleman will mediate.',
            href: '/disputes',
            cta: 'View disputes',
          },
          {
            icon: Calculator,
            title: 'Know the fees',
            body: 'Preview exactly what the buyer sends and the seller receives.',
            href: '/calculator',
            cta: 'Open calculator',
          },
        ].map((t) => (
          <div
            key={t.title}
            className="flex h-full flex-col rounded-2xl border bg-card/60 p-6 backdrop-blur"
          >
            <t.icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="mt-3 font-display font-semibold">{t.title}</p>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{t.body}</p>
            <Link
              href={t.href}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
