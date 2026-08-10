import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Coins,
  HelpCircle,
  LifeBuoy,
  MessageCircle,
  Network,
  Route,
  ShieldCheck,
  UserX,
  Wallet,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Help & Support Center | TrustVexa',
  description:
    'Find answers fast — browse the FAQ, how it works, documentation, trust & security, and status, or follow guided steps for the most common deal problems.',
};

const HUB: ReadonlyArray<{
  icon: typeof HelpCircle;
  title: string;
  description: string;
  href: string;
}> = [
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Quick answers to the questions we hear most often.',
    href: '/faq',
  },
  {
    icon: Route,
    title: 'How it works',
    description: 'The full escrow flow from invite to release, step by step.',
    href: '/how-it-works',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Detailed how-to guides for every part of a deal.',
    href: '/docs',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & Security',
    description: 'How we keep funds and accounts safe.',
    href: '/security',
  },
  {
    icon: MessageCircle,
    title: 'Contact',
    description: 'Reach the mediation team or open a ticket.',
    href: '/contact',
  },
  {
    icon: LifeBuoy,
    title: 'Status',
    description: 'Live platform and settlement network status.',
    href: '/status',
  },
];

const GUIDES: ReadonlyArray<{
  icon: typeof Wallet;
  title: string;
  steps: ReadonlyArray<string>;
}> = [
  {
    icon: UserX,
    title: 'The other side has gone quiet before delivery',
    steps: [
      'Use the deal chat to request a delivery or progress update first.',
      'Remember the 3-day completion clock keeps the deal moving even without replies.',
      'If nothing is ever delivered, you are protected — funds stay in escrow.',
      'Open a dispute and a mediator will review the evidence from both sides.',
    ],
  },
  {
    icon: UserX,
    title: 'You delivered and the buyer has gone quiet',
    steps: [
      'Confirm you delivered exactly what the deal describes and posted proof in the deal chat.',
      'If the buyer goes quiet after delivery, the inspection window auto-approves the release.',
      'Do not send or hand over anything outside the agreed deal terms.',
      'If you need help sooner, open a dispute and a mediator will step in.',
    ],
  },
  {
    icon: Coins,
    title: 'Refund or cancellation',
    steps: [
      'If a deal has not been funded or delivered, it can be cancelled by agreement.',
      'For a funded deal, raise the issue in the deal chat first.',
      'If you cannot agree, open a dispute and submit your evidence.',
      'The mediator reviews both sides and decides where the funds go.',
    ],
  },
  {
    icon: HelpCircle,
    title: 'Account access problem',
    steps: [
      'Double-check your email and password, then try the password reset link.',
      'Make sure you are using the correct email address for your account.',
      'Disable browser extensions that may block login, or try another browser.',
      'Still locked out? Contact support from the email tied to your account.',
    ],
  },
  {
    icon: Wallet,
    title: 'Funding is not showing on the deal',
    steps: [
      'Confirm the transfer completed and reached the required confirmation depth.',
      'Check you sent the exact asset and amount shown on the deal funding screen.',
      'Allow a few minutes — funding is credited once the settlement network confirms it.',
      'Still missing after confirmation? Open a ticket with your transaction reference.',
    ],
  },
  {
    icon: Network,
    title: 'Sent on the wrong settlement network',
    steps: [
      'Always match the network shown on the funding screen before you send anything.',
      'Sending on the wrong network can delay or lose funds, so verify first.',
      'If you already sent on the wrong network, do not send again.',
      'Contact us immediately with your transaction reference so we can investigate. Full settlement details are on the crypto settlement page.',
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <LifeBuoy className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Support
          </>
        }
        title="Help &amp; Support Center"
        subtitle="Whatever you need, start here. Browse the guides below, follow steps for a common problem, or reach the mediation team directly."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-14">
          {/* Hub cards */}
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold">Browse help topics</h2>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
              {HUB.map((item, i) => (
                <Reveal key={item.href} delay={(i % 3) * 80}>
                  <Link
                    href={item.href}
                    className="card-glow group flex h-full flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1"
                  >
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="flex items-center justify-between font-display font-semibold">
                      {item.title}
                      <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Guided help */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold">Guided help</h2>
              <p className="text-sm text-muted-foreground">
                Short, practical steps for the situations people run into most. If these do not
                resolve it, open a ticket and a mediator will help.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {GUIDES.map((guide, i) => (
                <Reveal key={guide.title} delay={(i % 2) * 80}>
                  <div className="h-full rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:shadow-glow">
                    <div className="flex items-center gap-2">
                      <guide.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <p className="font-display font-semibold">{guide.title}</p>
                    </div>
                    <ol className="mt-4 space-y-2.5">
                      {guide.steps.map((step, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Questions specific to how funds are settled?{' '}
              <Link
                href="/crypto"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                See crypto settlement
              </Link>
              .
            </p>
          </div>

          {/* Open a ticket */}
          <Reveal>
            <Card className="rounded-2xl border bg-card shadow-soft card-glow">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <CardTitle className="font-display text-base">
                    Still need help? Open a ticket
                  </CardTitle>
                  <CardDescription>
                    Reach a neutral mediator directly. Include your deal reference and any
                    transaction references so we can act quickly.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-0">
                <Button asChild variant="gradient" size="sm">
                  <Link href="/contact">Contact support</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/support">Open a ticket</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/faq">Browse FAQ</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
