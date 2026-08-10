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
  Store,
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
    'Real examples of deals you can safely complete with TrustVexa escrow — freelance projects, marketplace payouts, B2B services, digital products, and account transfers.',
};

type Example = { icon: typeof Boxes; title: string; body: string };

const SERVICES: ReadonlyArray<Example> = [
  {
    icon: Wrench,
    title: 'Freelance & development work',
    body: 'Pay for a build, a bug fix, or a design milestone. The buyer funds up front, the seller delivers, the buyer reviews, then funds release.',
  },
  {
    icon: Layers,
    title: 'Milestone-based projects',
    body: 'Break a larger engagement into stages so each completed milestone settles on its own before the next begins.',
  },
  {
    icon: Headphones,
    title: 'Consulting & B2B services',
    body: 'Audits, retainers, setup work, or a defined scope between two companies with no prior relationship. Agree the deliverable up front so acceptance is unambiguous.',
  },
];

const MARKETPLACES: ReadonlyArray<Example> = [
  {
    icon: Store,
    title: 'Marketplace orders & payouts',
    body: 'Hold buyer funds while an order is fulfilled, then release to the seller on confirmation — so a marketplace never has to arbitrate with its own money at stake.',
  },
  {
    icon: Sparkles,
    title: 'Domains & online assets',
    body: 'Transfer a domain name or an established website. The mediator confirms the transfer landed before settlement.',
  },
  {
    icon: Globe,
    title: 'High-value private sales',
    body: 'Two parties who found each other online and need a neutral third party to hold the money while the handover happens.',
  },
];

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
    icon: KeyRound,
    title: 'Account & subscription transfers',
    body: 'Transfer ownership of an account or membership you are entitled to sell. These carry extra risk, so they are routed to a mediator for review before release.',
  },
];

const ACCOUNTS: ReadonlyArray<Example> = [
  {
    icon: Globe,
    title: 'Social media accounts',
    body: 'Hand over an account you legitimately own. Credentials change hands under escrow protection with a mediator verifying the handover.',
  },
  {
    icon: Gamepad2,
    title: 'Gaming accounts',
    body: 'Sell an account you own. Escrow holds the payment until the buyer confirms access and recovery details.',
  },
  {
    icon: KeyRound,
    title: 'Licenses & activation keys',
    body: 'Legitimate keys and licenses, verified as working before the money moves.',
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
        title="Who uses TrustVexa"
        subtitle="Freelancers, marketplaces, and businesses use TrustVexa when a deal is too large to do on trust. If it is legal and it is yours to sell, escrow keeps both sides protected from funding to release."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Freelance & B2B services</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Define the deliverable clearly when you create the deal. Escrow protects the buyer
              until the work is delivered, and protects the freelancer from a payment that never
              arrives after delivery.
            </p>
            <ExampleGrid items={SERVICES} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Marketplaces & private sales</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              A neutral party holds the funds while the order is fulfilled, so neither the platform
              nor the parties have to front the risk.
            </p>
            <ExampleGrid items={MARKETPLACES} />
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Digital products</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Anything delivered as a file, a key, or a transfer. The buyer funds the deal, the
              seller delivers, and the completion clock keeps things moving toward release.
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
              risk and are routed to a mediator for review before funds can release. Only trade
              accounts you have the right to sell.
            </p>
            <ExampleGrid items={ACCOUNTS} />
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
                  doubt, reach out and a mediator can confirm before you create the deal.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="gradient" size="sm">
                  <Link href="/contact">Ask before you deal</Link>
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
        subtitle="Open an escrow deal and transact with both sides protected."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="View fees"
        secondaryHref="/fees"
      />
    </>
  );
}
