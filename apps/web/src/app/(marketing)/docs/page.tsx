import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Hash,
  Network,
  Rocket,
  Scale,
  Send,
  UserPlus,
  Wallet,
  Wrench,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Documentation | TrustVexa',
  description:
    'How-to guides for every part of a TrustVexa deal — getting started, creating and inviting, the 48-digit verification, funding, release, disputes, wallets & networks, and troubleshooting.',
};

type Guide = {
  icon: typeof Rocket;
  title: string;
  intro: string;
  steps: ReadonlyArray<string>;
};

const GUIDES: ReadonlyArray<Guide> = [
  {
    icon: Rocket,
    title: 'Getting started',
    intro: 'Set up your account so you are ready to trade.',
    steps: [
      'Create a free account and verify your email address.',
      'Read how the escrow flow works so both roles are clear.',
      'Have a supported wallet ready for USDT, SOL, BNB, ETH, or TRX.',
      'Decide whether you are the buyer (funds the deal) or the seller (delivers).',
    ],
  },
  {
    icon: UserPlus,
    title: 'Creating & inviting to a deal',
    intro: 'Define the terms once, then bring in the other party.',
    steps: [
      'Open a new deal and describe the item or service precisely.',
      'Set the amount, the coin, and the network for payment.',
      'Deals are screened against the prohibited list when created.',
      'Invite the counterparty so they can review and accept the terms.',
    ],
  },
  {
    icon: Hash,
    title: 'The 48-digit verification',
    intro: 'A shared code that confirms both sides are in the same deal.',
    steps: [
      'Each deal generates a unique 48-digit verification code.',
      'Both parties confirm they see the same code before funding.',
      'Matching codes prove you are transacting on the correct deal.',
      'Never share your code outside the deal — treat it as deal-specific.',
    ],
  },
  {
    icon: Wallet,
    title: 'Funding & confirmations',
    intro: 'The buyer deposits crypto into escrow.',
    steps: [
      'Send the exact coin and amount shown on the funding screen.',
      'Use the matching network for the coin you are sending.',
      'The deposit is credited once the network confirms it.',
      'The seller is notified that escrow is funded and can deliver.',
    ],
  },
  {
    icon: Send,
    title: 'Release',
    intro: 'Funds move to the seller once the buyer is satisfied.',
    steps: [
      'After delivery, the buyer inspects what they received.',
      'The buyer approves to release funds from escrow.',
      'If the buyer goes quiet, the inspection window auto-approves the release.',
      'A 0.5% seller settlement fee applies when funds are released.',
    ],
  },
  {
    icon: Scale,
    title: 'Disputes',
    intro: 'If something goes wrong, a neutral middleman decides.',
    steps: [
      'Raise the problem in the deal chat first to try to resolve it.',
      'If you cannot agree, open a dispute on the deal.',
      'Both sides submit evidence — screenshots, hashes, and messages.',
      'The middleman reviews and decides where the escrowed funds go.',
    ],
  },
  {
    icon: Network,
    title: 'Wallets & networks',
    intro: 'Supported coins and the networks they run on.',
    steps: [
      'USDT — send on TRC-20 (Tron) or ERC-20 (Ethereum).',
      'ETH — send on ERC-20 (Ethereum).',
      'BNB — send on BEP-20 (BNB Chain).',
      'TRX on Tron and SOL on Solana. Always match coin to network.',
    ],
  },
  {
    icon: Wrench,
    title: 'Troubleshooting',
    intro: 'Fixes for the most common funding issues.',
    steps: [
      'Payment not showing: confirm the transaction is finished and has on-chain confirmations.',
      'Wrong network: stop, do not resend, and contact the middleman with your transaction hash.',
      'Silent counterparty: the completion clock and auto-approve keep the deal moving; open a dispute if needed.',
      'Check the live status page if something platform-wide seems off.',
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Documentation
          </>
        }
        title="How-to guides"
        subtitle="Everything you need to run a deal end to end on TrustVexa — crypto-only escrow with a neutral middleman. Pick a topic below."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {GUIDES.map((guide, i) => (
              <Reveal key={guide.title} delay={(i % 2) * 80}>
                <div className="card-glow flex h-full flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <guide.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display font-semibold">{guide.title}</p>
                      <p className="text-xs text-muted-foreground">{guide.intro}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {guide.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Fees note */}
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
              <CircleDollarSign
                className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">A note on fees</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The escrow fee slides from 5% down to 1.35% as deal size grows, with a $30
                  minimum, plus a 0.5% seller settlement fee on release. See the full breakdown on
                  the{' '}
                  <Link
                    href="/fees"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    fees page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Reveal>

          {/* Troubleshooting callout */}
          <Reveal delay={80}>
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-6">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <div className="space-y-2">
                <p className="text-sm font-medium">Sent on the wrong network?</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Do not send again. Contact the middleman straight away with your transaction hash
                  so the deposit can be investigated.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/contact">Contact the middleman</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Ready to put it into practice?"
        subtitle="Open your first escrow deal and follow the guides as you go."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="See how it works"
        secondaryHref="/how-it-works"
      />
    </>
  );
}
