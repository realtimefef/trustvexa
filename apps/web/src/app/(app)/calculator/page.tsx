'use client';

import Link from 'next/link';
import {
  ArrowLeftRight,
  Calculator,
  CheckCircle2,
  Coins,
  Fuel,
  Info,
  Lightbulb,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { FeeCalculator } from '@/components/fee-calculator';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { PLATFORM_FEE_TIERS, formatBps, formatUsdCents } from '@/lib/fees';

const FEE_PARTS = [
  {
    icon: Percent,
    title: 'Platform fee — one total',
    body: 'A single tiered platform fee per deal. Buyer and seller agree how to split it; together their shares always add up to that one total.',
  },
  {
    icon: Receipt,
    title: 'Settlement fee — seller only',
    body: 'A flat 0.5% settlement fee is taken from the seller when funds release. It is never added to what the buyer sends.',
  },
  {
    icon: Fuel,
    title: 'Network gas — seller only',
    body: 'On-chain gas for the payout is paid by the seller. The buyer only ever sends the agreed deal amount plus their share of the platform fee.',
  },
];

const WHO_PAYS = [
  {
    icon: ShoppingCart,
    role: 'Buyer pays',
    accent: 'text-primary',
    items: ['The deal amount', 'Their agreed share of the platform fee'],
  },
  {
    icon: Store,
    role: 'Seller pays',
    accent: 'text-accent',
    items: [
      'Their agreed share of the platform fee',
      '0.5% settlement fee',
      'Network gas for the payout',
    ],
  },
];

const TIPS = [
  'Agree the platform-fee split in writing before funding — 50/50 is the common default.',
  'Larger deals land in lower fee tiers, so the effective rate drops as size grows.',
  'Sellers should price in the 0.5% settlement fee and gas when quoting a net amount.',
  'Lock the deal coin early; every figure is fixed to the FX rate at funding.',
];

const FACTS = [
  {
    icon: Scale,
    title: 'Flexible split',
    body: 'Buyer and seller decide how to share the platform fee — 50/50, 70/30, or any ratio.',
  },
  {
    icon: Coins,
    title: 'Settled in your coin',
    body: 'Every figure is shown in the deal coin and locked to the live FX rate at funding.',
  },
  {
    icon: ShieldCheck,
    title: 'Locked at funding',
    body: 'Once funded, the breakdown is saved on the deal so it can never shift later.',
  },
];

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardPageHeader
        title="Fee calculator"
        description="Estimate exactly what the buyer sends and the seller receives — before you open a deal."
        action={
          <Button asChild variant="gradient">
            <Link href="/deals/new">Start a deal</Link>
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-3">
        {FACTS.map((f) => (
          <Card key={f.title} className="rounded-2xl shadow-soft">
            <CardHeader>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">{f.title}</CardTitle>
              <CardDescription>{f.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Estimate fees
            </CardTitle>
            <CardDescription>
              Buyer and seller see the identical breakdown — switch views to confirm.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FeeCalculator />
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Platform fee tiers</CardTitle>
            <CardDescription>The rate drops as deals get larger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {PLATFORM_FEE_TIERS.map((tier) => (
              <div
                key={tier.lowerInclusiveCents}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">
                  {formatUsdCents(tier.lowerInclusiveCents)} –{' '}
                  {formatUsdCents(tier.upperExclusiveCents - 1)}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                  {formatBps(tier.bps)}
                </span>
              </div>
            ))}
            <p className="flex items-start gap-2 pt-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> A flat $30 minimum platform fee
              applies, plus a 0.5% seller settlement fee on every deal.
            </p>
          </CardContent>
        </Card>
      </div>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="How fees work"
          title="Three simple parts, no surprises"
          subtitle="Every deal breaks down the same way. Knowing the parts means you always know exactly what lands where."
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {FEE_PARTS.map((part) => (
            <Card
              key={part.title}
              className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <CardHeader>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <part.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <CardTitle className="font-display text-base">{part.title}</CardTitle>
                <CardDescription>{part.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Worked example"
          title="A $1,000 deal at a glance"
          subtitle="An illustrative walkthrough with a 50/50 platform-fee split. Use the calculator above for exact figures on your own deal."
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="rounded-2xl border bg-card shadow-soft">
            <CardHeader>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="font-display text-base">Buyer sends</CardTitle>
              <CardDescription>
                The $1,000 deal amount plus their half of the platform fee — one clean transfer.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border bg-muted/30 shadow-soft">
            <CardHeader>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="font-display text-base">Escrow holds</CardTitle>
              <CardDescription>
                Funds sit safely in escrow until delivery is approved or the inspection window
                lapses.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border bg-card shadow-soft">
            <CardHeader>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                <Coins className="h-5 w-5" aria-hidden="true" />
              </span>
              <CardTitle className="font-display text-base">Seller receives</CardTitle>
              <CardDescription>
                The deal amount minus their platform-fee share, the 0.5% settlement fee, and gas.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading
          align="left"
          eyebrow="Who pays what"
          title="Buyer vs. seller, side by side"
          subtitle="A clear split of every cost so both sides know their number before funding."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {WHO_PAYS.map((side) => (
            <Card key={side.role} className="rounded-2xl border bg-card shadow-soft">
              <CardHeader>
                <CardTitle
                  className={`flex items-center gap-2 font-display text-base ${side.accent}`}
                >
                  <side.icon className="h-5 w-5" aria-hidden="true" /> {side.role}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {side.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Badge variant="outline" className="h-5 px-1.5">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      </Badge>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Lightbulb className="h-5 w-5 text-warning" aria-hidden="true" /> Tips for a clean
              settlement
            </CardTitle>
            <CardDescription>
              Small habits that keep fees predictable and deals friction-free.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
