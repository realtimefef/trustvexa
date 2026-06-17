'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  LifeBuoy,
  ListChecks,
  Mail,
  MessageSquare,
  Network,
  RefreshCw,
  ShieldQuestion,
  Timer,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { FaqAccordion } from '@/components/visual/faq-accordion';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';

const CHANNELS = [
  {
    icon: MessageSquare,
    title: 'Live chat',
    body: 'Chat with our support team in real time, usually under 2 minutes.',
    cta: 'Start chat',
    href: '#',
  },
  {
    icon: Mail,
    title: 'Email support',
    body: 'Send us the details and we’ll respond within one business day.',
    cta: 'Email us',
    href: '/contact',
  },
  {
    icon: BookOpen,
    title: 'Help center',
    body: 'Browse guides on funding, delivery, disputes, and payouts.',
    cta: 'Read guides',
    href: '/how-it-works',
  },
];

const FAQ = [
  {
    q: 'How do I fund a deal?',
    a: 'Open the deal, copy the escrow address for your chosen network, and send the exact amount. Funds are confirmed on-chain before the deal advances.',
  },
  {
    q: 'When are funds released to the seller?',
    a: 'Funds release once the buyer approves delivery, or when the inspection window lapses without a dispute under the agreed terms.',
  },
  {
    q: 'How do I open a dispute?',
    a: 'Open the relevant deal and choose “Open dispute”. A neutral middleman will review the evidence and apply the written terms.',
  },
  {
    q: 'How long do withdrawals take?',
    a: 'Withdrawals are processed on-chain shortly after you confirm. Network confirmation times vary by chain.',
  },
];

const GUIDES = [
  {
    icon: Wallet,
    title: 'Funding a deal',
    body: 'Step-by-step on copying the escrow address and sending the exact amount on the right network.',
    href: '/how-it-works',
  },
  {
    icon: Network,
    title: 'Sent on the wrong network',
    body: 'What to do if funds went out on a chain the escrow address does not support.',
    href: '/how-it-works',
  },
  {
    icon: Clock,
    title: 'Seller has gone silent',
    body: 'How inspection windows and timeouts protect you when a counterparty stops responding.',
    href: '/how-it-works',
  },
  {
    icon: RefreshCw,
    title: 'Requesting a refund',
    body: 'When refunds apply, how disputes are reviewed, and how settled funds are returned.',
    href: '/how-it-works',
  },
];

const RESPONSE_TIMES = [
  {
    icon: MessageSquare,
    label: 'Live chat',
    value: '< 2 min',
    hint: 'Median first response',
    accent: 'success' as const,
  },
  {
    icon: Mail,
    label: 'Email',
    value: '< 1 day',
    hint: 'One business day',
    accent: 'primary' as const,
  },
  {
    icon: Timer,
    label: 'Urgent deal issues',
    value: '24/7',
    hint: 'Always staffed',
    accent: 'warning' as const,
  },
];

const PRECHECKS = [
  'Have your deal ID ready — it speeds up every request.',
  'Note the network and transaction hash for any funding question.',
  'Check the deal timeline; many answers are already in the activity log.',
  'Skim the FAQ below — common issues are resolved in seconds.',
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <DashboardPageHeader
        title="Support"
        description="Get help with deals, funding, payouts, and disputes."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <Card
            key={c.title}
            className="card-glow rounded-2xl shadow-soft transition-all hover:-translate-y-1"
          >
            <CardHeader>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">{c.title}</CardTitle>
              <CardDescription>{c.body}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={c.href}>{c.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Reveal>
        <Card className="rounded-2xl border-primary/20 bg-primary/[0.03] shadow-soft">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-success/15 text-success">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">All systems operational</p>
              <p className="text-xs text-muted-foreground">
                Escrow, funding, and payouts are running normally. We post incidents here first.
              </p>
            </div>
            <Badge variant="success">Live</Badge>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Response times"
          title="What to expect when you reach out"
          subtitle="Typical first-response windows across our channels. Urgent deal issues are always prioritised."
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {RESPONSE_TIMES.map((rt) => (
            <StatCard
              key={rt.label}
              icon={rt.icon}
              label={rt.label}
              value={rt.value}
              hint={rt.hint}
              accent={rt.accent}
            />
          ))}
        </div>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Popular guides"
          title="Quick answers to the most common issues"
          subtitle="Most questions are solved in a couple of minutes with these walkthroughs."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.title}
              href={guide.href}
              className="group flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <guide.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-semibold">{guide.title}</span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{guide.body}</span>
              </span>
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" /> Before you contact
              us
            </CardTitle>
            <CardDescription>
              A little prep helps us resolve your issue on the first reply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PRECHECKS.map((check) => (
                <li key={check} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {check}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldQuestion className="h-5 w-5 text-primary" /> Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FaqAccordion items={FAQ} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-primary/20 bg-primary/[0.03] shadow-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-6 w-6 text-primary" aria-hidden="true" />
            <div>
              <p className="font-medium">Still need help?</p>
              <p className="text-sm text-muted-foreground">
                Our team is available 24/7 for urgent deal issues.
              </p>
            </div>
          </div>
          <Button asChild variant="gradient">
            <Link href="/contact">Contact support</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
