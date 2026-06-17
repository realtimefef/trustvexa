import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Boxes,
  Code2,
  FileText,
  Gamepad2,
  Globe,
  Headphones,
  KeyRound,
  Layers,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Use cases | TrustVexa',
  description:
    'Real examples of deals you can safely complete with TrustVexa escrow — digital products, account transfers, and freelance services — settled in crypto with a neutral middleman.',
};

type Example = { icon: typeof Boxes; title: string; body: string };

const DIGITAL: ReadonlyArray<Example> = [
  {
    icon: Code2,
    title: 'Source code & software',
    body: 'Sell a finished app, script, plugin, or template. Funds are held until the buyer confirms the files download and run as described.',
  },
  {
    icon: FileText,
    title: 'Digital files & licenses',
    body: 'E-books, design assets, datasets, and legitimate software licenses or product keys — released once the buyer verifies they work.',
  },
  {
    icon: Sparkles,
    title: 'Domains & online assets',
    body: 'Transfer a domain name or established website. The middleman confirms the transfer landed before settlement.',
  },
];

const ACCOUNTS: ReadonlyArray<Example> = [
  {
    icon: Globe,
    title: 'Social media accounts',
    body: 'Hand over an Instagram, TikTok, YouTube, or X account you legitimately own. Credentials change hands under escrow protection.',
  },
  {
    icon: Gamepad2,
    title: 'Gaming accounts',
    body: 'Sell a Steam, Epic, or Riot account you own. Escrow holds the payment until the buyer confirms access and recovery details.',
  },
  {
    icon: KeyRound,
    title: 'Subscription & service accounts',
    body: 'Transfer ownership of an account or membership you are entitled to sell. The middleman verifies the handover before release.',
  },
];

const SERVICES: ReadonlyArray<Example> = [
  {
    icon: Wrench,
    title: 'Freelance & development work',
    body: 'Pay for a build, a bug fix, or a design milestone. The seller delivers, the buyer reviews, then funds release.',
  },
  {
    icon: Headphones,
    title: 'Consulting & one-off services',
    body: 'Audits, setup help, or a defined piece of work. Agree the deliverable up front so confirmation is clear.',
  },
  {
    icon: Layers,
    title: 'Milestone-based projects',
    body: 'Break a larger engagement into deals so each completed stage settles on its own before the next begins.',
  },
];

function ExampleGrid({ items }: { items: ReadonlyArray<Example> }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.map((item, i) => (
        <Reveal key={item.title} delay={i * 90}>
          <div className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">{item.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default function UseCasesPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Boxes className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Use cases
          </>
        }
        title="What you can trade"
        subtitle="TrustVexa is a crypto-only escrow service with a neutral middleman. If a deal is legal and the goods are yours to sell, escrow keeps both sides protected from funding to release."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Digital products</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Anything delivered as a file, a key, or a transfer. The buyer funds the deal, the
              seller delivers, and the 3-day completion clock keeps things moving toward release.
            </p>
            <ExampleGrid items={DIGITAL} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Account transfers</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Selling an account you legitimately own is allowed, but these categories carry extra
              risk and are routed to a middleman for review before funds can release. Only trade
              accounts you have the right to sell.
            </p>
            <ExampleGrid items={ACCOUNTS} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Services & freelance work</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Define the deliverable clearly when you create the deal. Escrow protects the buyer
              until the work is delivered and protects the seller from a chargeback after delivery.
            </p>
            <ExampleGrid items={SERVICES} />
          </div>

          {/* Prohibited reminder */}
          <Reveal>
            <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
                  aria-hidden="true"
                />
                <div className="space-y-2">
                  <p className="font-display text-lg font-semibold">
                    Some things are never allowed
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Firearms, drugs, stolen accounts or data, bulk or mass-created accounts, and any
                    illegal goods or services are banned outright. Every deal is automatically
                    screened against our prohibited list when it is created, and banned items are
                    rejected. Review the full list before you start.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-1">
                    <Link href="/prohibited">See prohibited &amp; restricted items</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Not sure? */}
          <Reveal delay={80}>
            <Card className="rounded-2xl border bg-card shadow-soft card-glow">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">
                  Not sure if your deal qualifies?
                </CardTitle>
                <CardDescription>
                  If your item is legal and yours to sell, it is almost certainly allowed. When in
                  doubt, reach out and a middleman can confirm before you create the deal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="gradient" size="sm">
                  <Link href="/contact">Ask before you trade</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/how-it-works">See how it works</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Found your use case?"
        subtitle="Open an escrow deal and trade your digital goods, accounts, or services with both sides protected."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="View fees"
        secondaryHref="/fees"
      />
    </>
  );
}
