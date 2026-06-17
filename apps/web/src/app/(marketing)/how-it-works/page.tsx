import type { Metadata } from 'next';
import {
  CheckCircle2,
  Clock,
  EyeOff,
  Gavel,
  HandCoins,
  Lock,
  PackageCheck,
  RefreshCw,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Store,
  Timer,
  UserPlus,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { CtaBand } from '@/components/visual/cta-band';

export const metadata: Metadata = {
  title: 'How it works | TrustVexa',
  description:
    'How TrustVexa crypto escrow protects buyers and sellers, step by step, with a neutral middleman.',
};

const STEPS: ReadonlyArray<{ icon: typeof UserPlus; title: string; body: string }> = [
  {
    icon: UserPlus,
    title: 'Create a deal & invite',
    body: 'The initiator sets the amount, coin, network, and who pays the fee, then invites the counterparty with a single-use link and a verification code. Both sides agree to the written terms before anything moves.',
  },
  {
    icon: Lock,
    title: 'Buyer funds escrow',
    body: 'The buyer sends crypto to a unique escrow address. The platform waits for the required on-chain confirmation depth and checks the amount against a locked FX quote before the deal advances.',
  },
  {
    icon: PackageCheck,
    title: 'Seller delivers',
    body: 'Once funds are confirmed, the seller hands over the digital product or account and submits proof. The buyer reviews within the agreed inspection window.',
  },
  {
    icon: CheckCircle2,
    title: 'Buyer approves',
    body: 'When the buyer confirms everything is as described, the deal is approved and the payout is queued. If the window lapses without a dispute, release can proceed under the agreed terms.',
  },
  {
    icon: HandCoins,
    title: 'Funds release',
    body: 'The seller is paid out in the chosen coin, minus the platform fee and a small settlement fee. Every movement is recorded in a double-entry ledger down to the smallest unit.',
  },
  {
    icon: Gavel,
    title: 'Disputes & mediation',
    body: 'If something goes wrong, either side can open a dispute. A neutral middleman reviews the evidence, applies the terms, and issues a final decision — release, refund, or a partial settlement.',
  },
];

const ROLES = [
  {
    icon: ShoppingCart,
    role: 'Buyer',
    color: 'text-sky-500',
    duties: [
      'Agrees the deal and price',
      'Funds escrow from any wallet',
      'Inspects the delivery',
      'Approves or opens a dispute',
    ],
  },
  {
    icon: Store,
    role: 'Seller',
    color: 'text-emerald-500',
    duties: [
      'Creates the deal & invites the buyer',
      'Hands the product to the middleman',
      'Submits delivery proof',
      'Receives payout on approval',
    ],
  },
  {
    icon: Scale,
    role: 'Middleman',
    color: 'text-primary',
    duties: [
      'Stays out until both sides are ready',
      'Verifies and transfers the product',
      'Mediates any dispute neutrally',
      'Releases funds with dual-control',
    ],
  },
];

const SAFEGUARDS = [
  {
    icon: Timer,
    title: '3-day completion clock',
    body: 'Once the middleman is contacted, the deal must complete within 3 days or it auto-cancels and refunds the buyer.',
  },
  {
    icon: Clock,
    title: 'Inspection auto-approve',
    body: 'If the buyer goes silent after delivery, an inspection window auto-releases so an honest seller still gets paid.',
  },
  {
    icon: RefreshCw,
    title: 'Pre-funding expiry',
    body: 'A deal that is never funded simply expires and cancels — with no penalty because no money was sent.',
  },
  {
    icon: ShieldCheck,
    title: 'On-chain verification',
    body: 'Funding is confirmed on-chain at the required depth, and every state change is logged immutably.',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Step by step
          </>
        }
        title="How TrustVexa escrow works"
        subtitle="Escrow keeps funds safe between strangers. Money is only released when both sides have done their part — and a neutral middleman is always on standby."
      />

      {/* Timeline */}
      <section className="section">
        <div className="container max-w-4xl">
          <ol className="relative space-y-10 before:absolute before:left-[27px] before:top-2 before:h-[calc(100%-2rem)] before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-border before:to-transparent">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 70}>
                <li className="relative flex gap-6">
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <step.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:shadow-glow">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold">{step.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Roles */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Who does what"
              title="Three roles, one safe deal"
              subtitle="Everyone knows their part — and the middleman only steps in when the money needs handling."
            />
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.role} delay={i * 100}>
                <div className="card-glow h-full rounded-2xl border bg-card p-7 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <r.icon className={`h-6 w-6 ${r.color}`} aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-lg font-semibold">{r.role}</h3>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {r.duties.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Safeguards */}
      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={
                <>
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Built-in protection
                </>
              }
              title="Safeguards on every deal"
              subtitle="Automatic timers and rules keep deals moving and protect whoever is acting in good faith."
            />
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SAFEGUARDS.map((s, i) => (
              <Reveal key={s.title} delay={(i % 4) * 90}>
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
      </section>

      <section className="border-y bg-primary/5">
        <div className="container py-6">
          <Reveal>
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-8 sm:text-left">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <EyeOff className="h-6 w-6 text-primary" aria-hidden />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-tight sm:text-lg">
                  Secure yourself — no private or personal information needed
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Your real name, address, and ID are never shared with your counterparty. Personal details stay encrypted and private — only the deal terms and a one-time verification code are exchanged between parties.
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-6 text-sm text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1.5"><EyeOff className="h-4 w-4 text-primary" aria-hidden /> No ID required</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" aria-hidden /> AES-256-GCM encrypted</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Private by design</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Ready to start a deal?"
        subtitle="Deals range from $400 to $50,000 and settle in your chosen coin. See the full fee schedule before you commit."
        primaryLabel="Create an account"
        primaryHref="/register"
        secondaryLabel="View fees"
        secondaryHref="/fees"
      />
    </>
  );
}
