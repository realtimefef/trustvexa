import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Coins, Globe, Layers, ShieldCheck, Timer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BlockchainGlobe } from '@/components/visual/blockchain-globe';
import { CoinOrbit } from '@/components/visual/coin-orbit';
import { CtaBand } from '@/components/visual/cta-band';
import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';

export const metadata: Metadata = {
  title: 'Crypto settlement | TrustVexa',
  description:
    'How TrustVexa escrow deals are funded and settled on-chain: supported assets, networks, confirmation rules, and network costs.',
};

const RAILS = [
  'USDT on Ethereum, BNB Chain, TRON and Solana',
  'ETH on Ethereum',
  'BNB on BNB Chain',
  'SOL on Solana',
  'TRX on TRON',
  'Funding verified on-chain before a deal advances',
];

const MECHANICS = [
  {
    icon: Layers,
    title: 'One address per deal',
    body: 'Each escrow deal gets its own funding address, so funds are never commingled between deals and every payment maps to a single agreement.',
  },
  {
    icon: Timer,
    title: 'Confirmation depth',
    body: 'A deal only becomes Funded after the required number of confirmations for that network. Larger or higher-risk deals can require additional depth.',
  },
  {
    icon: ShieldCheck,
    title: 'Dual-control payouts',
    body: 'Large payouts require two approvers before a transaction is broadcast, and every release is written to the double-entry ledger.',
  },
];

export default function CryptoSettlementPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Coins className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Settlement
          </>
        }
        title="Crypto settlement"
        subtitle="TrustVexa escrow deals are currently funded and settled in digital assets. This page documents exactly how that works — the assets, the networks, and the rules a deal has to pass before funds move."
      />

      <section className="section">
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Multi-chain
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Five assets across four networks
            </h2>
            <p className="mt-4 text-muted-foreground">
              You choose the asset and network when the deal is created, and settlement happens in
              that same asset — no surprise conversions. Network fees are passed through at cost, so
              a cheaper chain means the seller keeps more.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {RAILS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="outline" className="mt-6">
              <Link href="/coins">
                Full asset &amp; network table <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </Reveal>
          <Reveal delay={120} className="flex justify-center">
            <BlockchainGlobe />
          </Reveal>
        </div>
      </section>

      <section className="section border-t bg-muted/20">
        <div className="container grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="flex justify-center">
            <CoinOrbit />
          </Reveal>
          <div>
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow={
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> How funding works
                  </>
                }
                title="The rules a deal has to pass"
                subtitle="Settlement mechanics are deliberately boring. Money only moves when the conditions below are satisfied."
              />
            </Reveal>
            <div className="mt-8 grid gap-4">
              {MECHANICS.map((m, i) => (
                <Reveal key={m.title} delay={i * 90}>
                  <div className="flex gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <m.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display font-semibold">{m.title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section border-t">
        <div className="container max-w-3xl">
          <Reveal>
            <div className="rounded-2xl border bg-card p-7 shadow-soft">
              <p className="font-display text-xl font-bold tracking-tight">A note on scope</p>
              <p className="mt-3 text-muted-foreground">
                TrustVexa is an escrow and dispute-resolution platform. We are not an exchange, a
                broker, or a custodial wallet service, and we do not issue, trade, or make markets in
                any digital asset. Digital assets are the settlement rail we support today; the
                product itself is the escrow workflow, the milestone logic, and the mediation process.
              </p>
              <p className="mt-3 text-muted-foreground">
                Additional settlement rails are on our roadmap. Anything not yet live is labelled as
                planned on this site.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Pick your asset and start a deal"
        subtitle="Choose your settlement asset and network, invite your counterparty, and let escrow do the rest."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="See fees"
        secondaryHref="/fees"
      />
    </>
  );
}
