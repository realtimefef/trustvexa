import type { Metadata } from 'next';
import { Coins, Gauge, Layers, ShieldCheck, Timer, Zap } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { CoinOrbit } from '@/components/visual/coin-orbit';
import { CtaBand } from '@/components/visual/cta-band';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Supported coins | TrustVexa',
  description: 'Coins and networks supported for crypto escrow on TrustVexa.',
};

// Mirrors COIN_NETWORK_SUPPORT in apps/api/src/modules/deal/deal.schemas.ts.
const COIN_SUPPORT: ReadonlyArray<{ coin: string; name: string; networks: string[] }> = [
  { coin: 'USDT', name: 'Tether USD', networks: ['TRON', 'Ethereum', 'BNB Chain', 'Solana'] },
  { coin: 'ETH', name: 'Ether', networks: ['Ethereum'] },
  { coin: 'BNB', name: 'BNB', networks: ['BNB Chain'] },
  { coin: 'SOL', name: 'Solana', networks: ['Solana'] },
  { coin: 'TRX', name: 'TRON', networks: ['TRON'] },
];

// Mirrors the per-chain confirmation rules in the plan (§8 / §23).
const CONFIRMATIONS: ReadonlyArray<{ network: string; rule: string; gas: string; speed: string }> =
  [
    { network: 'Solana (SPL)', rule: 'Finalized status', gas: '~$0.001', speed: 'Near-instant' },
    {
      network: 'BNB Chain (BEP-20)',
      rule: '15 confirmations',
      gas: '$0.05 – $0.30',
      speed: 'Fast',
    },
    { network: 'TRON (TRC-20)', rule: '20 confirmations', gas: '$0.50 – $1.50', speed: 'Fast' },
    { network: 'Ethereum (ERC-20)', rule: '12 confirmations', gas: '$2 – $10', speed: 'Moderate' },
  ];

const CHOOSE = [
  {
    icon: Zap,
    title: 'Cheapest & fastest',
    network: 'Solana (SPL)',
    body: 'Fractions of a cent in gas and near-instant settlement — ideal for most deals.',
  },
  {
    icon: Gauge,
    title: 'Cheap & widely used',
    network: 'BNB Chain · TRON',
    body: 'Very low gas with broad wallet support. A safe default for everyday trades.',
  },
  {
    icon: Layers,
    title: 'Most established',
    network: 'Ethereum (ERC-20)',
    body: 'The most battle-tested chain. Gas runs higher, so best reserved for larger deals.',
  },
];

export default function CoinsPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Coins className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Multi-chain
          </>
        }
        title="Supported coins & networks"
        subtitle="Choose your settlement coin and network when you create a deal. Each coin settles only on its supported chains."
      />

      {/* Coin cards + orbit */}
      <section className="section">
        <div className="container grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            {COIN_SUPPORT.map((entry, i) => (
              <Reveal key={entry.coin} delay={(i % 2) * 90}>
                <div className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient font-display text-sm font-bold text-white shadow-glow">
                      {entry.coin}
                    </span>
                    <div>
                      <p className="font-display font-semibold">{entry.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{entry.coin}</p>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Networks
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.networks.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium"
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150} className="flex justify-center">
            <CoinOrbit />
          </Reveal>
        </div>
      </section>

      {/* Per-chain confirmation rules */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-5xl">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow={
                <>
                  <Timer className="h-3.5 w-3.5" aria-hidden="true" /> Funding rules
                </>
              }
              title="Per-chain confirmations & gas"
              subtitle="A deal only moves to Funded after enough on-chain confirmations. Larger or suspicious deals can require extra depth."
            />
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <div className="overflow-hidden rounded-2xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Network</TableHead>
                    <TableHead>Confirmation rule</TableHead>
                    <TableHead>Typical gas</TableHead>
                    <TableHead>Speed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONFIRMATIONS.map((c) => (
                    <TableRow key={c.network}>
                      <TableCell className="font-medium">{c.network}</TableCell>
                      <TableCell>{c.rule}</TableCell>
                      <TableCell className="text-muted-foreground">{c.gas}</TableCell>
                      <TableCell>
                        <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                          {c.speed}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How to choose a network */}
      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={
                <>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Pick the right chain
                </>
              }
              title="How to choose a network"
              subtitle="Gas is a pass-through cost, so the cheaper the chain, the more the seller keeps."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {CHOOSE.map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <div className="card-glow group h-full rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <c.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {c.network}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Pick your coin and start a deal"
        subtitle="Choose your settlement coin and network, invite your counterparty, and let escrow do the rest."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="See fees"
        secondaryHref="/fees"
      />
    </>
  );
}
