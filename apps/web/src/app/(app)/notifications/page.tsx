'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  BellRing,
  CheckCheck,
  Gavel,
  HelpCircle,
  Lock,
  MailCheck,
  MoonStar,
  Settings,
  ShieldCheck,
  Smartphone,
  Wallet,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface NotificationView {
  id: string;
  dealId: string | null;
  type: string;
  payload: Record<string, unknown>;
  priority: 'normal' | 'important';
  pinned: boolean;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

const NOTIF_TYPES = [
  {
    icon: Lock,
    title: 'Escrow & funding',
    body: 'Know the instant a buyer funds escrow or a balance is locked for a deal you are part of.',
  },
  {
    icon: ShieldCheck,
    title: 'Deal status',
    body: 'Delivery confirmations, approvals, and completions — every change to a deal’s state.',
  },
  {
    icon: Gavel,
    title: 'Disputes',
    body: 'Updates when a dispute is opened, reviewed by a middleman, or resolved with an outcome.',
  },
  {
    icon: Wallet,
    title: 'Payouts',
    body: 'Confirmation when funds are released or a withdrawal lands at your settlement address.',
  },
];

const CHANNELS = [
  {
    icon: BellRing,
    title: 'In-app alerts',
    body: 'Real-time updates shown here the moment something changes on your account.',
  },
  {
    icon: Smartphone,
    title: 'Push & mobile',
    body: 'Optional push notifications so time-sensitive deal events reach you anywhere.',
  },
  {
    icon: MailCheck,
    title: 'Daily digest',
    body: 'A once-a-day email summary that rolls up everything you missed into one tidy recap.',
  },
];

const NOTIF_FAQS = [
  {
    q: 'Can I turn off certain notifications?',
    a: 'Yes. Choose exactly which event types and channels you receive from your notification preferences.',
  },
  {
    q: 'What are quiet hours?',
    a: 'Quiet hours pause non-urgent alerts during a window you set, then deliver them together once it ends.',
  },
  {
    q: 'Will I still be told about urgent deal events?',
    a: 'Critical events such as escrow funding and dispute updates are always surfaced so nothing time-sensitive slips by.',
  },
];

function getNotificationDetails(type: string, payload: Record<string, unknown>) {
  let title = 'Alert';
  let body: string = typeof payload.message === 'string' ? payload.message : 'Notification received';
  let icon = Bell;
  let tone: 'primary' | 'success' | 'warning' = 'primary';

  switch (type) {
    case 'payment:received':
      title = payload.status === 'underpaid' ? 'Deposit Underpaid' : 'Deposit Received';
      body =
        payload.status === 'underpaid'
          ? `Received ${payload.received} ${payload.coin} (Expected ${payload.expected} ${payload.coin}). Shortfall: ${payload.shortfall} ${payload.coin}.`
          : `Received deposit of ${payload.amount} ${payload.coin} for deal ${payload.dealId || ''}.`;
      icon = Wallet;
      tone = payload.status === 'underpaid' ? 'warning' : 'success';
      break;
    case 'deal:created':
      title = 'New Deal Created';
      body = `Deal "${payload.title || ''}" has been created.`;
      icon = Lock;
      tone = 'primary';
      break;
    case 'deal:funded':
      title = 'Deal Escrow Funded';
      body = `Escrow has been funded for deal "${payload.title || ''}".`;
      icon = Lock;
      tone = 'success';
      break;
    case 'deal:released':
      title = 'Funds Released';
      body = `Escrow funds released to the seller for deal "${payload.title || ''}".`;
      icon = ShieldCheck;
      tone = 'success';
      break;
    case 'deal:refunded':
      title = 'Deal Refunded';
      body = `Escrow funds have been refunded to the buyer for deal "${payload.title || ''}".`;
      icon = Wallet;
      tone = 'success';
      break;
    case 'deal:cancelled':
      title = 'Deal Cancelled';
      body = `Deal "${payload.title || ''}" has been cancelled.`;
      icon = AlertTriangle;
      tone = 'warning';
      break;
    case 'dispute:opened':
      title = 'Dispute Opened';
      body = `A dispute has been opened for deal "${payload.title || ''}".`;
      icon = Gavel;
      tone = 'warning';
      break;
    case 'dispute:resolved':
      title = 'Dispute Resolved';
      body = `The dispute for deal "${payload.title || ''}" has been resolved.`;
      icon = Gavel;
      tone = 'success';
      break;
    case 'payout:sent':
      title = 'Payout Dispatched';
      body = `Payout of ${payload.amount || ''} ${payload.coin || ''} has been broadcast on-chain.`;
      icon = Wallet;
      tone = 'success';
      break;
    case 'sla:warning':
      title = 'Milestone Deadline Warning';
      body = `Urgent SLA inspection or funding deadline approaching.`;
      icon = Clock;
      tone = 'warning';
      break;
  }

  return { title, body, icon, tone };
}

const toneMap = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
} as const;

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    isError,
  } = useQuery<{ items: NotificationView[] }>({
    queryKey: ['notifications'],
    queryFn: async () => apiRequest<{ items: NotificationView[] }>('/notifications'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () =>
      apiRequest('/notifications/read-all', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/notifications/${id}/read`, {
        method: 'PATCH',
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = notificationsData?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        title="Notifications"
        description="Stay on top of every change to your deals and account."
        action={
          <Button
            variant="outline"
            onClick={() => markAllReadMutation.mutate()}
            disabled={
              items.length === 0 || items.every((n) => n.read) || markAllReadMutation.isPending
            }
          >
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
          </Button>
        }
      />

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="divide-y p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <p className="p-8 text-center text-sm text-destructive">
              Failed to load notifications. Please try refreshing.
            </p>
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              You don&apos;t have any notifications yet.
            </p>
          ) : (
            items.map((n) => {
              const { title, body, icon: Icon, tone } = getNotificationDetails(n.type, n.payload);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) {
                      markReadMutation.mutate(n.id);
                    }
                  }}
                  className={cn(
                    'flex gap-4 p-5 transition-colors cursor-pointer hover:bg-muted/10',
                    !n.read ? 'bg-primary/[0.04]' : '',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      toneMap[tone],
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{title}</p>
                      {!n.read ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
                    {n.dealId && (
                      <div className="mt-2">
                        <Link
                          href={`/deals/${n.dealId}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Go to Deal <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Reveal>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="What you'll hear about"
            title="Notification types"
            subtitle="We only ping you about things that matter to your deals and your money."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {NOTIF_TYPES.map((item) => (
              <Card
                key={item.title}
                className="rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                <CardContent className="flex gap-4 p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-display font-semibold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </div>
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
            eyebrow="Channels"
            title="Quiet hours & digest"
            subtitle="Choose how and when updates reach you, so you stay informed without the noise."
          />
          <div className="grid gap-5 sm:grid-cols-3">
            {CHANNELS.map((item) => (
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
          <Card className="rounded-2xl border bg-muted/30 shadow-soft">
            <CardContent className="flex items-start gap-4 p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MoonStar className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="font-display font-semibold">Set your quiet hours</p>
                <p className="text-sm text-muted-foreground">
                  Pause non-urgent alerts overnight or during focus time. Anything that arrives in
                  the window is bundled and delivered the moment quiet hours end — urgent deal
                  events always still come through.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </Reveal>

      <Reveal delay={120}>
        <Card className="rounded-2xl border bg-brand-gradient text-white shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Settings className="h-6 w-6" />
              </span>
              <div>
                <CardTitle className="font-display text-xl">Manage your preferences</CardTitle>
                <CardDescription className="text-white/80">
                  Fine-tune which events and channels you receive in settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/settings">
                Open notification settings <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={140}>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title="Notification questions"
            subtitle="Quick answers about how alerts are delivered and controlled."
          />
          <div className="space-y-4">
            {NOTIF_FAQS.map((item) => (
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
