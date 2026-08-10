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
    'How-to guides for every part of a TrustVexa deal — getting started, creating and inviting, the 48-digit verification, funding, release, disputes, settlement, and troubleshooting.',
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
    intro: 'Set up your account so you are ready to transact.',
    steps: [
      'Create a free account and verify your email address.',
      'Read how the escrow flow works so both roles are clear.',
      'Decide whether you are the buyer (funds the deal) or the seller (delivers the work or asset).',
      'Check the settlement page so you know how funds move before you start.',
    ],
  },
  {
    icon: UserPlus,
    title: 'Creating & inviting to a deal',
    intro: 'Define the terms once, then bring in the other party.',
    steps: [
      'Open a new deal and describe the work, service, or item precisely.',
      'Set the amount and the delivery terms both sides are agreeing to.',
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
    intro: 'The buyer funds the deal and TrustVexa holds it in escrow.',
    steps: [
      'Send the exact asset and amount shown on the deal funding screen.',
      'Use the matching settlement network for the asset you are sending.',
      'Funding is credited once it reaches the required confirmation depth.',
      'The seller is notified that escrow is funded and can begin or deliver.',
    ],
  },
  {
    icon: Send,
    title: 'Release',
    intro: 'Funds move to the seller once the buyer is satisfied.',
    steps: [
      'After delivery, the buyer inspects the work or asset they received.',
      'The buyer approves to release funds from escrow.',
      'If the buyer goes quiet, the inspection window auto-approves the release.',
      'A 0.5% seller settlement fee applies when funds are released.',
    ],
  },
  {
    icon: Scale,
    title: 'Disputes',
    intro: 'If something goes wrong, a neutral mediator decides.',
    steps: [
      'Raise the problem in the deal chat first to try to resolve it.',
      'If you cannot agree, open a dispute on the deal.',
      'Both sides submit evidence — screenshots, transaction references, and messages.',
      'The mediator reviews and decides where the escrowed funds go. Decisions are made by a person, not an algorithm.',
    ],
  },
  {
    icon: Network,
    title: 'Settlement & networks',
    intro: 'How funds are moved today, and on which networks.',
    steps: [
      'Settlement currently runs on digital assets, with more rails planned.',
      'USDT settles on TRC-20 (Tron), ERC-20 (Ethereum), BEP-20 (BNB Chain), or Solana.',
      'ETH on Ethereum, BNB on BNB Chain, TRX on Tron, SOL on Solana.',
      'Always match the asset to the network shown on the funding screen.',
    ],
  },
  {
    icon: Wrench,
    title: 'Troubleshooting',
    intro: 'Fixes for the most common funding issues.',
    steps: [
      'Funding not showing: confirm the transfer completed and reached the required confirmations.',
      'Wrong network: stop, do not resend, and contact support with your transaction reference.',
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
        subtitle="Everything you need to run a deal end to end on TrustVexa — milestone-based escrow with a neutral mediator. Pick a topic below."
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

          {/* Settlement note */}
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
              <Network className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">How settlement works today</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Deals are currently funded and paid out in digital assets, with additional
                  settlement rails on our roadmap. Networks, confirmation depths, and payout controls
                  are documented on the{' '}
                  <Link
                    href="/crypto"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    crypto settlement page
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Reveal>

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
                  Do not send again. Contact us straight away with your transaction reference so the
                  funding can be investigated.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/contact">Contact support</Link>
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
