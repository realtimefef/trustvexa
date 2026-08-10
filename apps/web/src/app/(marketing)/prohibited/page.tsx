import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, ScanSearch, ShieldAlert, ShieldCheck } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';

export const metadata: Metadata = {
  title: 'Prohibited items | TrustVexa',
  description:
    'Items and activities that are banned on TrustVexa, and categories that require mediator review.',
};

// Mirrors PROHIBITED_GROUPS / RISKY_GROUPS in
// apps/api/src/modules/deal/prohibited-items.ts. Deal text is screened against
// these categories at creation time.
const BLOCKED: ReadonlyArray<{ title: string; examples: string }> = [
  {
    title: 'Firearms & weapons',
    examples: 'Guns, rifles, ammunition, silencers, explosives, and related parts.',
  },
  {
    title: 'Drugs & controlled substances',
    examples: 'Narcotics and other illegal or controlled drugs.',
  },
  {
    title: 'Stolen accounts or data',
    examples: 'Hacked or cracked accounts, leaked databases, card dumps, and carding tools.',
  },
  {
    title: 'Bulk / mass accounts',
    examples: 'Account farms, phone-verified account batches, and mass-created social accounts.',
  },
  {
    title: 'Illegal items & activity',
    examples:
      'Counterfeits, forged or fake identity documents, CSAM, trafficking, and any other unlawful goods or services.',
  },
];

const REVIEW: ReadonlyArray<{ title: string; examples: string }> = [
  {
    title: 'Social media accounts',
    examples: 'Instagram, TikTok, YouTube, X, Telegram, and similar account transfers.',
  },
  {
    title: 'Financial accounts',
    examples: 'PayPal, bank, Stripe, Wise, and other payment-service accounts.',
  },
  { title: 'Gift cards', examples: 'Retail and platform gift cards or codes.' },
  {
    title: 'Game & gaming accounts',
    examples: 'Steam, Epic, Riot, and other game account transfers.',
  },
  {
    title: 'Crypto credentials',
    examples:
      'Seed phrases, private keys, and wallet recovery material (high-risk; handle with care).',
  },
  { title: 'Software licenses', examples: 'License, serial, activation, and product keys.' },
];

export default function ProhibitedItemsPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <ShieldAlert className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Safety
          </>
        }
        title="Prohibited & restricted items"
        subtitle="To keep TrustVexa safe and lawful, some items are banned outright and others are allowed only under mediator review. Deals are automatically screened when they are created."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-14">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Banned — never allowed</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {BLOCKED.map((item, i) => (
                <Reveal key={item.title} delay={(i % 2) * 80}>
                  <div className="h-full rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6 transition-all hover:shadow-glow">
                    <p className="font-display font-semibold">{item.title}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.examples}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">Allowed with mediator review</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              These categories carry extra risk, so deals involving them are routed to a mediator for
              oversight before funds can be released.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {REVIEW.map((item, i) => (
                <Reveal key={item.title} delay={(i % 2) * 80}>
                  <div className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                    <p className="font-display font-semibold">{item.title}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{item.examples}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* How screening works */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold">How screening works</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: ScanSearch,
                  title: 'Automatic check at creation',
                  body: 'When a deal is created, the item description and terms are scanned against our prohibited and restricted lists.',
                },
                {
                  icon: ShieldAlert,
                  title: 'Risky items go to review',
                  body: 'Restricted categories are flagged and routed to a neutral mediator who reviews before funds can release.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Banned items are blocked',
                  body: 'Anything on the banned list is rejected outright, and repeated attempts can lead to account action.',
                },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 90}>
                  <div className="h-full rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <s.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="font-display font-semibold">{s.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Attempting to trade banned items violates our{' '}
            <Link
              href="/terms"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Terms of Service
            </Link>{' '}
            and may be reported to the relevant authorities.
          </p>
        </div>
      </section>

      <CtaBand
        title="Transact with confidence"
        subtitle="If your work or item is legal and permitted, escrow keeps the whole deal safe end to end."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="Read the rules"
        secondaryHref="/terms"
      />
    </>
  );
}
