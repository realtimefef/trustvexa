import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  Bell,
  Eye,
  Fingerprint,
  KeyRound,
  Lock,
  Network,
  Scale,
  ServerCog,
  ShieldCheck,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { FeatureSplit } from '@/components/visual/feature-split';
import { ShieldVisual } from '@/components/visual/shield-visual';
import { CtaBand } from '@/components/visual/cta-band';

export const metadata: Metadata = {
  title: 'Trust & Security Center | TrustVexa',
  description:
    'How TrustVexa keeps your funds and data safe: escrow controls, encryption, double-entry accounting, and responsible disclosure.',
};

const PILLARS: ReadonlyArray<{ icon: typeof Lock; title: string; body: string }> = [
  {
    icon: Lock,
    title: 'Funds held in escrow',
    body: 'Buyer funds are confirmed on-chain and held in escrow until the deal terms are met. Money never moves on an unverified instruction.',
  },
  {
    icon: Scale,
    title: 'Server-side, double-entry money',
    body: 'Every amount is computed server-side in the smallest unit and recorded in an append-only double-entry ledger, so balances always reconcile.',
  },
  {
    icon: KeyRound,
    title: 'Encryption & key management',
    body: 'Sensitive data is encrypted at rest with envelope encryption backed by a master key, and access is scoped on a need-to-know basis.',
  },
  {
    icon: Eye,
    title: 'Privacy by default',
    body: 'The presence of a middleman on a deal is kept private, and counterparties only see what they need to complete the transaction.',
  },
  {
    icon: ServerCog,
    title: 'Operational integrity',
    body: 'Critical settings are change-controlled with cooldowns and rollback, and background jobs are monitored with alerting and dead-letter handling.',
  },
  {
    icon: ShieldCheck,
    title: 'Account protection',
    body: 'Strong password rules, breached-password screening, session controls, and step-up confirmation on sensitive actions protect your account.',
  },
];

const FUND_STEPS: ReadonlyArray<{ icon: typeof Lock; title: string; body: string }> = [
  {
    icon: Wallet,
    title: 'Confirmed on-chain',
    body: 'Deposits are matched to the deal and confirmed at the required network depth before funding.',
  },
  {
    icon: Lock,
    title: 'Locked in escrow',
    body: 'Funds are held against the deal and can never be moved on an unverified instruction.',
  },
  {
    icon: ShieldCheck,
    title: 'Released on approval',
    body: 'Money only releases when the buyer approves or the agreed terms are met — with dual-control on large payouts.',
  },
];

const DATA_PROTECTION: ReadonlyArray<{ icon: typeof Lock; title: string; body: string }> = [
  {
    icon: Fingerprint,
    title: 'Encrypted PII',
    body: 'Email and sign-up details are encrypted at rest and only the neutral middleman can view them to run a deal.',
  },
  {
    icon: KeyRound,
    title: 'Passwords never readable',
    body: 'Passwords are hashed with a modern algorithm and are never visible to anyone — including the operator.',
  },
  {
    icon: Network,
    title: 'Wallets hidden',
    body: 'Every wallet address and transaction is encrypted and never exposed to another user.',
  },
  {
    icon: Eye,
    title: 'PII access logged',
    body: 'Every time personal info is decrypted or viewed, it is recorded for full accountability.',
  },
];

const ACCOUNTABILITY = [
  { value: 'Hash-chained', label: 'Tamper-evident audit logs' },
  { value: 'Dual-control', label: 'On large payouts' },
  { value: 'Allowlist', label: 'Operator withdrawal addresses' },
  { value: 'Screened', label: 'Deposit & payout addresses' },
];

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Trust & Security
          </>
        }
        title="Security is the product"
        subtitle="Here is how we protect your funds, your data, and your deals — at every layer of the platform."
      />

      {/* Funds protected — feature split with shield visual */}
      <section className="section">
        <div className="container">
          <FeatureSplit
            eyebrow={
              <>
                <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Your funds, protected
              </>
            }
            title="Money only moves when both sides have delivered"
            body="Escrow removes the leap of faith from trading with a stranger. Funds are confirmed on-chain, held against the deal, and released only on approval — never on an unverified instruction."
            points={[
              'On-chain confirmation before funding',
              'Held in escrow, not on deposit',
              'Dual-control on large releases',
              'Refund to buyer on expiry or dispute',
            ]}
            visual={<ShieldVisual />}
          />
        </div>
      </section>

      {/* Fund lifecycle steps */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="How escrow protects you"
              title="Three guardrails on every deal"
              subtitle="From the moment funds arrive to the moment they're released, each step is verified and logged."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {FUND_STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="relative h-full rounded-2xl border bg-card/60 p-7 backdrop-blur">
                  <span className="absolute right-5 top-5 font-display text-4xl font-bold text-muted/40">
                    {i + 1}
                  </span>
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                    <s.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Security pillars */}
      <section className="section">
        <div className="container max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow={
                <>
                  <ServerCog className="h-3.5 w-3.5" aria-hidden="true" /> Defense in depth
                </>
              }
              title="Security at every layer"
              subtitle="Six pillars that protect your money, your data, and the integrity of every transaction."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.title} delay={(i % 3) * 100}>
                <div className="card-glow group h-full rounded-2xl border bg-card p-7 shadow-soft transition-all hover:-translate-y-1">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <pillar.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="font-display text-lg font-semibold">{pillar.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Data protection */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-6xl">
          <Reveal>
            <SectionHeading
              eyebrow={
                <>
                  <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" /> Your data
                </>
              }
              title="Private by design, encrypted by default"
              subtitle="We collect the minimum, encrypt the sensitive, and never sell your data."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DATA_PROTECTION.map((d, i) => (
              <Reveal key={d.title} delay={(i % 4) * 90}>
                <div className="h-full rounded-2xl border bg-card p-6 shadow-soft">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <d.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display font-semibold">{d.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Accountability band */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="grid grid-cols-2 gap-6 rounded-3xl border bg-card/60 p-6 backdrop-blur sm:gap-8 sm:p-8 md:grid-cols-4 md:p-10">
              {ACCOUNTABILITY.map((a) => (
                <div key={a.label} className="text-center">
                  <p className="font-display text-2xl font-bold tracking-tight">
                    <span className="text-gradient">{a.value}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{a.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Operations + disclosure */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-5xl space-y-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: Activity,
                title: 'Monitored 24/7',
                body: 'Health checks, error tracking, and balance reconciliation against on-chain state.',
              },
              {
                icon: Bell,
                title: 'Incident response',
                body: 'A written plan to detect, contain, and notify if data is ever exposed.',
              },
              {
                icon: ShieldAlert,
                title: 'Emergency pause',
                body: 'A circuit breaker can pause deposits, payouts, or a chain during an incident.',
              },
            ].map((o, i) => (
              <Reveal key={o.title} delay={i * 90}>
                <div className="h-full rounded-2xl border bg-card p-6 shadow-soft">
                  <o.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  <p className="mt-3 font-display font-semibold">{o.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="space-y-3 rounded-2xl border bg-card/60 p-6 backdrop-blur sm:p-8">
              <h2 className="font-display text-lg font-semibold">Responsible disclosure</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Found a vulnerability? We appreciate your help. Please report it privately so we can
                fix it before it is disclosed. Email{' '}
                <a
                  href="mailto:support@trustvexa.com"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  support@trustvexa.com
                </a>{' '}
                with steps to reproduce. Our machine-readable policy is published at{' '}
                <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
                  /.well-known/security.txt
                </code>
                . Please do not access other users’ data, degrade the service, or disclose publicly
                until we have resolved the issue.
              </p>
              <p className="pt-1 text-sm text-muted-foreground">
                Questions about security or your data? Read our{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>{' '}
                or{' '}
                <Link
                  href="/contact"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  contact us
                </Link>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Trade on a platform built for trust"
        subtitle="Escrow-held funds, a neutral middleman, and a tamper-evident audit trail on every deal."
        primaryLabel="Get started"
        primaryHref="/register"
        secondaryLabel="How it works"
        secondaryHref="/how-it-works"
      />
    </>
  );
}
