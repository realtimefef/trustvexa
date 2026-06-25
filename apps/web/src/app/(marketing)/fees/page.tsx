import type { Metadata } from 'next';
import {
  ArrowLeftRight,
  CheckCircle2,
  Coins,
  Gauge,
  Receipt,
  ShoppingCart,
  Store,
  Wallet,
} from 'lucide-react';

import { FeeCalculator } from '@/components/fee-calculator';
import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PLATFORM_FEE_TIERS, estimateFees, formatBps, formatUsdCents } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'Fees | TrustVexa',
  description:
    'Transparent escrow fees: a sliding platform fee from 5% to 1.35% with a $30 minimum.',
};

const HIGHLIGHTS = [
  { icon: Gauge, title: 'Sliding scale', body: 'Fees drop from 5% to 1.35% as deals get larger.' },
  { icon: Receipt, title: '$30 minimum', body: 'A flat floor so small deals stay sustainable.' },
  { icon: Wallet, title: '0.5% settlement', body: 'A small seller settlement fee on payout.' },
  {
    icon: Coins,
    title: 'Gas at cost',
    body: 'On-chain network gas passed through, shown at funding.',
  },
];

// Real network (gas) cost by chain (plan §7, 2026 rates). Gas is a live
// pass-through, shown in $ and as a % of the deal.
const GAS_TABLE: ReadonlyArray<{ network: string; gas: string; pct: string }> = [
  { network: 'Solana (SPL)', gas: '~$0.001 or less', pct: '~0.0001%' },
  { network: 'BNB Chain (BEP-20)', gas: '$0.05 – $0.30', pct: '~0.005% – 0.03%' },
  { network: 'TRON (TRC-20)', gas: '$0.50 – $1.50', pct: '~0.05% – 0.15%' },
  { network: 'Ethereum (ERC-20)', gas: '$2 – $10', pct: '~0.2% – 1%' },
];

// Worked examples (buyer pays the platform fee; figures shown before gas),
// computed from the same engine that runs the deal.
const EXAMPLE_AMOUNTS_CENTS = [40_000, 100_000, 250_000, 1_000_000, 5_000_000];

export default function FeesPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Receipt className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Pricing
          </>
        }
        title="Simple, transparent fees"
        subtitle="A sliding-scale platform fee that gets cheaper as deals get larger, plus a small seller settlement fee. On-chain network gas is passed through at cost."
      />

      {/* How fees compare — feature line band */}
      <section className="border-y bg-muted/20">
        <div className="container py-10">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                label: 'No monthly fee',
                note: 'Pay only when you run a deal. No subscriptions, no idle charges.',
              },
              {
                label: 'No withdrawal fee',
                note: 'Funds released to the seller carry only the standard on-chain gas.',
              },
              {
                label: 'No hidden charges',
                note: 'Every fee — platform, settlement, and gas — is shown before you fund.',
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-display font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container max-w-5xl space-y-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HIGHLIGHTS.map((h, i) => (
              <Reveal key={h.title} delay={i * 80}>
                <div className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <h.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display font-semibold">{h.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{h.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="space-y-4">
              <SectionHeading align="left" title="Platform fee tiers" />
              <div className="overflow-hidden rounded-2xl border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal amount</TableHead>
                      <TableHead>Platform fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PLATFORM_FEE_TIERS.map((tier) => (
                      <TableRow key={tier.lowerInclusiveCents}>
                        <TableCell className="font-medium">
                          {formatUsdCents(tier.lowerInclusiveCents)} &ndash;{' '}
                          {formatUsdCents(tier.upperExclusiveCents - 1)}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                            {formatBps(tier.bps)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Minimum platform fee: $30 per deal.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Seller settlement fee: 0.5% of the deal
                  amount.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Network gas: real on-chain cost, shown at
                  funding.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary">•</span> Fee payer (buyer, seller, or split) chosen
                  at deal creation.
                </li>
              </ul>
            </div>
          </Reveal>

          <Reveal>
            <div className="space-y-4">
              <SectionHeading
                align="left"
                title="Transaction (gas) fee by network"
                subtitle="The seller's payout also covers the real on-chain gas — a live pass-through, never marked up. On the recommended chains it is a rounding error next to the deal."
              />
              <div className="overflow-hidden rounded-2xl border bg-card">
                <Table className="min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coin / network</TableHead>
                      <TableHead>Typical real gas (2026)</TableHead>
                      <TableHead>As % of deal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {GAS_TABLE.map((g) => (
                      <TableRow key={g.network}>
                        <TableCell className="font-medium">{g.network}</TableCell>
                        <TableCell>{g.gas}</TableCell>
                        <TableCell className="text-muted-foreground">{g.pct}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                The fixed dollar gas shrinks as a % on bigger deals. Gas is read live at payout time
                (plus a small buffer so payouts don&apos;t fail).
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="space-y-4">
              <SectionHeading
                align="left"
                title="Worked examples"
                subtitle="Platform fee shown as buyer-paid; the 0.5% seller fee comes from the payout. Gas is separate and tiny on the recommended chains."
              />
              <div className="overflow-hidden rounded-2xl border bg-card">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Platform fee</TableHead>
                      <TableHead>0.5% seller fee</TableHead>
                      <TableHead>Platform take</TableHead>
                      <TableHead>Buyer sends</TableHead>
                      <TableHead>Seller receives*</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EXAMPLE_AMOUNTS_CENTS.map((amount) => {
                      const e = estimateFees(amount, 'buyer');
                      return (
                        <TableRow key={amount}>
                          <TableCell className="font-medium">{formatUsdCents(amount)}</TableCell>
                          <TableCell>{formatUsdCents(e.platformFeeCents)}</TableCell>
                          <TableCell>{formatUsdCents(e.settlementFeeCents)}</TableCell>
                          <TableCell>{formatUsdCents(e.platformKeepsCents)}</TableCell>
                          <TableCell>{formatUsdCents(e.buyerSendsCents)}</TableCell>
                          <TableCell>{formatUsdCents(e.sellerReceivesCents)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                *Seller receives is shown before gas; the live network fee above is also deducted
                from the payout. A $30 minimum platform fee applies on the smallest deals.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="space-y-4">
              <SectionHeading
                align="left"
                title="Estimate your fees"
                subtitle="Plug in a deal amount, choose the network for gas, and set who pays the platform fee — see exactly what the buyer sends and the seller receives."
              />
              <div className="rounded-2xl border bg-card p-6 shadow-soft">
                <FeeCalculator />
              </div>
            </div>
          </Reveal>

          {/* Fee payer scenarios */}
          <Reveal>
            <div className="space-y-6">
              <SectionHeading
                align="left"
                title="Fee payer scenarios"
                subtitle="At deal creation you choose who absorbs the platform fee. Here is how each option works in practice."
              />
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="card-glow flex h-full flex-col rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-semibold">Buyer pays</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The most common setup. The buyer tops up the deal amount with the platform fee
                    so the seller receives the full agreed price.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Buyer sends: </span>
                      deal amount + platform fee + gas
                    </li>
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Seller receives: </span>
                      deal amount − 0.5% settlement fee − gas
                    </li>
                  </ul>
                </div>

                <div className="card-glow flex h-full flex-col rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Store className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-semibold">Seller pays</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Good when the seller wants to advertise a fixed cost-to-buyer price. The
                    platform fee comes out of the seller's payout instead.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Buyer sends: </span>
                      deal amount only + gas
                    </li>
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Seller receives: </span>
                      deal amount − platform fee − 0.5% settlement fee − gas
                    </li>
                  </ul>
                </div>

                <div className="card-glow flex h-full flex-col rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display text-base font-semibold">Split</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Both sides share the platform fee equally. Useful when buyer and seller want to
                    split costs fairly and the deal price is negotiated net of fees.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Buyer sends: </span>
                      deal amount + half the platform fee + gas
                    </li>
                    <li className="text-muted-foreground">
                      <span className="font-medium text-foreground">Seller receives: </span>
                      deal amount − half the platform fee − 0.5% settlement fee − gas
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>

          {/* FAQ */}
          <Reveal>
            <div className="space-y-5">
              <SectionHeading
                align="left"
                title="Frequently asked fee questions"
                subtitle="Straightforward answers to the questions we get most."
              />
              <div className="space-y-3">
                <details className="group rounded-2xl border bg-card shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-display font-semibold">
                    Is there a free trial?
                    <span
                      className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>
                  <div className="border-t px-6 pb-6 pt-4 text-sm leading-relaxed text-muted-foreground">
                    There is no free trial in the traditional sense, but there is also no cost to
                    create an account or draft a deal. You only pay the platform fee when a deal is
                    actually funded — so you can explore the interface, set up a deal structure, and
                    review exact fee estimates without spending anything.
                  </div>
                </details>

                <details className="group rounded-2xl border bg-card shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-display font-semibold">
                    Can fees change after a deal is funded?
                    <span
                      className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>
                  <div className="border-t px-6 pb-6 pt-4 text-sm leading-relaxed text-muted-foreground">
                    No. Once a deal is funded the platform fee is locked at the rate calculated at
                    funding time. If we update our published fee schedule in the future, the change
                    only applies to newly funded deals — your in-progress deal is unaffected. Gas
                    costs are read live at payout time, but the platform percentage is fixed.
                  </div>
                </details>

                <details className="group rounded-2xl border bg-card shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-display font-semibold">
                    What if my deal amount falls in two fee tiers?
                    <span
                      className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>
                  <div className="border-t px-6 pb-6 pt-4 text-sm leading-relaxed text-muted-foreground">
                    Our fee tiers are not blended — the rate that applies is the single tier your
                    deal amount falls into at the moment of funding. For example, a $2,500 deal
                    falls entirely in the tier covering that range and is charged that tier's flat
                    rate. There is no prorated blending across tiers.
                  </div>
                </details>

                <details className="group rounded-2xl border bg-card shadow-soft">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-display font-semibold">
                    Is the gas fee capped?
                    <span
                      className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      ↓
                    </span>
                  </summary>
                  <div className="border-t px-6 pb-6 pt-4 text-sm leading-relaxed text-muted-foreground">
                    Gas is a live pass-through and is not capped by TrustVexa. It reflects the real
                    on-chain cost at the time of payout, plus a small buffer to prevent failed
                    transactions during fee spikes. If gas is unusually high on your chosen network,
                    consider settling on Solana or BNB Chain where gas is consistently minimal. The
                    gas estimate is always shown before you confirm a payout.
                  </div>
                </details>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
