import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Building2,
  Eye,
  Globe2,
  KeyRound,
  MapPin,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { CtaBand } from '@/components/visual/cta-band';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'About | TrustVexa',
  description:
    'What TrustVexa is, who it is for, and the principles behind our crypto escrow service.',
};

const VALUES: ReadonlyArray<{ icon: typeof Scale; title: string; body: string }> = [
  {
    icon: Scale,
    title: 'Neutrality',
    body: 'Our middleman has no stake in the outcome of a deal. Decisions follow the agreed terms and the evidence — nothing else.',
  },
  {
    icon: ScrollText,
    title: 'Accountability',
    body: 'Every state change and every cent is recorded in an append-only, double-entry ledger. Math happens server-side in integer smallest units, so balances always reconcile.',
  },
  {
    icon: Eye,
    title: 'Privacy',
    body: 'Sensitive deal details are encrypted at rest, and the presence of a middleman stays private to protect both sides of a trade.',
  },
  {
    icon: ShieldCheck,
    title: 'Transparency',
    body: 'Fees are published up front on a clear sliding scale. There are no surprise charges and no hidden spreads.',
  },
];

const STATS = [
  { value: '$400 – $50k', label: 'Supported deal range' },
  { value: '5 coins', label: 'Across 4 networks' },
  { value: 'Crypto-only', label: 'No fiat, no KYC docs' },
  { value: 'Neutral', label: 'Human middleman on every deal' },
];

const TEAM = [
  {
    name: 'Ethan R. Caldwell',
    role: 'Founder & Lead Developer',
    bio: "Builds TrustVexa around one mission: the private, secure transfer of money and goods between people who don't yet trust each other.",
    initials: 'EC',
  },
  {
    name: 'Jonathan M. Pierce',
    role: 'US Operations Lead',
    bio: 'The US-based point of contact for operations, support escalations, and partnerships.',
    initials: 'JP',
  },
];

const ROADMAP: ReadonlyArray<{
  icon: typeof Zap;
  badge: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
  title: string;
  description: string;
}> = [
  {
    icon: Zap,
    badge: 'Now',
    badgeVariant: 'success',
    title: 'More chains',
    description:
      'We are actively evaluating additional layer-1 and layer-2 networks to bring more coin choices to buyers and sellers. Priority goes to chains with low gas and high settlement finality.',
  },
  {
    icon: KeyRound,
    badge: 'Next',
    badgeVariant: 'warning',
    title: 'Multi-sig custody',
    description:
      'Upgrading the escrow wallet layer to a 2-of-3 multi-signature scheme so no single key can unilaterally move funds. This raises the security bar significantly for large deals.',
  },
  {
    icon: Globe2,
    badge: 'Future',
    badgeVariant: 'secondary',
    title: 'Global escrow',
    description:
      'Expanding to more markets and deal types — from freelance contracts and domain names to physical goods — while keeping the same neutral, evidence-based resolution process.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Our mission
          </>
        }
        title="Escrow built for the crypto era"
        subtitle="TrustVexa is a crypto-only escrow service for safely trading digital products and online accounts between people who don't yet trust each other."
      />

      {/* Mission band */}
      <section className="border-y bg-muted/20">
        <div className="container grid grid-cols-2 gap-8 py-14 md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <p className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                <span className="text-gradient">{s.value}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why we built it */}
      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <span className="eyebrow">
              <Target className="h-3.5 w-3.5" aria-hidden="true" /> Why we built it
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Trading online shouldn't require blind trust
            </h2>
            <p className="mt-4 text-muted-foreground">
              Trading digital goods online is risky: the buyer fears paying for nothing, and the
              seller fears handing over goods without payment. Traditional escrow is slow,
              expensive, and rarely built for crypto. TrustVexa holds funds securely while both
              sides complete their obligations, with a neutral middleman ready to mediate if a deal
              goes sideways.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-5 sm:grid-cols-2">
              {VALUES.map((value) => (
                <div
                  key={value.title}
                  className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1"
                >
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <value.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display font-semibold">{value.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {value.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Team */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-5xl">
          <Reveal>
            <SectionHeading
              eyebrow="The people behind it"
              title="Built by a small, focused team"
              subtitle="A founder who knows the product cold, and a US-based operations lead you can reach."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={i * 100}>
                <div className="flex h-full gap-5 rounded-2xl border bg-card p-7 shadow-soft">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient font-display text-lg font-bold text-white shadow-glow">
                    {m.initials}
                  </span>
                  <div>
                    <p className="font-display text-lg font-semibold">{m.name}</p>
                    <p className="text-sm font-medium text-primary">{m.role}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Company facts */}
      <section className="section">
        <div className="container max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal>
              <div className="flex h-full gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur">
                <Building2 className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-display font-semibold">The company</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Operated by a privately held, multi-investor-funded company.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="flex h-full gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur">
                <MapPin className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-display font-semibold">US headquarters</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    1007 N Orange St, 4th Floor, Wilmington, DE 19801, USA.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="flex h-full gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur">
                <ScrollText className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-display font-semibold">Legal & terms</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Full details live in our{' '}
                    <Link
                      href="/terms"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Terms of Service
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Our promise */}
      <section className="section border-t">
        <div className="container max-w-5xl">
          <Reveal>
            <div className="rounded-3xl bg-brand-gradient p-10 text-white shadow-glow">
              <p className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                We have no stake in the outcome of any deal
              </p>
              <p className="mt-3 max-w-2xl text-white/80">
                TrustVexa earns a fixed platform fee regardless of who wins a dispute. That
                independence is the foundation of every principle we build on.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/90">
                    <strong className="font-semibold text-white">
                      Funds only move when terms are met.
                    </strong>{' '}
                    The escrowed amount stays locked until both sides confirm delivery or a
                    middleman ruling is issued — there is no way to silently drain it.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/90">
                    <strong className="font-semibold text-white">
                      Decisions follow evidence, not preference.
                    </strong>{' '}
                    Our middlemen review the agreed terms and submitted proof. They have no
                    financial incentive to favor either party.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    ✓
                  </span>
                  <span className="text-white/90">
                    <strong className="font-semibold text-white">
                      Fees are published and never hidden.
                    </strong>{' '}
                    Every applicable charge — platform fee, settlement fee, and on-chain gas — is
                    shown before you fund a deal. Nothing appears at checkout that wasn't disclosed.
                  </span>
                </li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Roadmap & vision */}
      <section className="section border-t bg-muted/30">
        <div className="container max-w-5xl">
          <Reveal>
            <SectionHeading
              eyebrow="What's coming"
              title="Roadmap & vision"
              subtitle="We build deliberately. Here is where TrustVexa is headed and when."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {ROADMAP.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="card-glow flex h-full flex-col rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <Badge variant={item.badgeVariant}>{item.badge}</Badge>
                  </div>
                  <p className="font-display text-lg font-semibold">{item.title}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open positions */}
      <section className="section border-t">
        <div className="container max-w-5xl">
          <Reveal>
            <div className="rounded-2xl border bg-card p-8 shadow-soft">
              <p className="font-display text-xl font-bold tracking-tight">Open positions</p>
              <p className="mt-3 text-muted-foreground">
                TrustVexa is a lean team — we keep it that way on purpose. Small teams ship faster,
                communicate better, and stay accountable to each other. We don't add headcount
                unless the need is clear and the person is exceptional.
              </p>
              <p className="mt-4 text-muted-foreground">
                If you're a sharp developer or operations specialist who cares about security and
                honest dealing, we'd like to hear from you. Tell us what you've built, what you care
                about, and why escrow infrastructure matters to you.
              </p>
              <p className="mt-5 text-sm">
                Reach out at{' '}
                <a
                  href="mailto:support@trustvexa.com"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  support@trustvexa.com
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Trade with people, safely"
        subtitle="Create your account and open your first escrow deal in minutes."
        primaryLabel="Create free account"
        primaryHref="/register"
        secondaryLabel="Contact us"
        secondaryHref="/contact"
      />
    </>
  );
}
