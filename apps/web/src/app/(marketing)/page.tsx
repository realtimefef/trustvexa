import Link from 'next/link';
import {
  ArrowRight, Boxes, Brain, Check, Coins, Database, FileCheck, Gavel, Globe,
  Handshake, KeyRound, Lock, Package, Scale, Search, ShieldCheck, ShoppingCart,
  Sparkles, Star, Store, UserPlus, Wallet, Workflow, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityTicker } from '@/components/visual/activity-ticker';
import { AuroraBackground } from '@/components/visual/aurora-background';
import { CountUp } from '@/components/visual/count-up';
import { DealFlowSvg } from '@/components/visual/deal-flow-svg';
import { DealTimelineSvg } from '@/components/visual/deal-timeline-svg';
import { FaqAccordion } from '@/components/visual/faq-accordion';
import { FeatureSplit } from '@/components/visual/feature-split';
import { HeroEscrowCard } from '@/components/visual/hero-escrow-card';
import { LedgerStack } from '@/components/visual/ledger-stack';
import { Marquee } from '@/components/visual/marquee';
import { ParticleField } from '@/components/visual/particle-field';
import { Reveal } from '@/components/visual/reveal';
import { SecurityRing } from '@/components/visual/security-ring';
import { SectionHeading } from '@/components/visual/section-heading';
import { ShieldVisual } from '@/components/visual/shield-visual';
import { TiltCard } from '@/components/visual/tilt-card';

const STEPS = [
  { icon: Wallet,      title: 'Create a deal',      body: 'Set the amount, the deliverables, and the milestone schedule. Invite the other side with a single-use link and verification code.' },
  { icon: Lock,        title: 'Buyer funds escrow',  body: 'The buyer funds the deal. Nothing is released to the seller until the funds are confirmed and the terms are locked in.' },
  { icon: ShieldCheck, title: 'Seller delivers',     body: 'The seller delivers the work or the asset. The buyer inspects within an agreed window, with a neutral mediator on standby.' },
  { icon: Gavel,       title: 'Release or mediate',  body: 'On approval, funds release to the seller. Disputes go to a neutral mediator; a double-entry ledger keeps every cent accounted for.' },
];

const FEATURES = [
  { icon: Workflow,   title: 'Milestone-based releases', body: 'Split a project into stages and release payment stage by stage, so neither side carries the whole risk at once.' },
  { icon: Scale,      title: 'Neutral mediation',        body: 'A human mediator resolves disputes against the written terms and the submitted evidence, with full audit history.' },
  { icon: Coins,      title: 'Transparent fees',         body: 'A clear sliding-scale fee from 5% down to 1.35% with a $30 minimum. No hidden charges, ever.' },
  { icon: FileCheck,  title: 'Evidence-based disputes',  body: 'Terms, deliverables, and messages are captured as they happen, so a dispute is decided on a record rather than on memory.' },
  { icon: Database,   title: 'Double-entry ledger',      body: 'A tamper-evident ledger accounts for every cent across escrow, fees, and settlement — fully auditable.' },
  { icon: Lock,       title: 'Encrypted by default',     body: 'Deal details are envelope-encrypted at rest and access is scoped to the parties on the deal.' },
];

const STATS = [
  { value: 4,    suffix: ' stages',           label: 'Escrow stages per deal' },
  { value: 1.35, suffix: '%', decimals: 2,    label: 'Lowest platform fee' },
  { value: 50,   suffix: 'k', label: 'Maximum deal size (USD)' },
  { value: 24,   suffix: '/7',                label: 'Dispute mediation' },
];

const AUDIENCES = ['Freelancers', 'Agencies', 'Online marketplaces', 'B2B services', 'Domain & site sales', 'Digital goods sellers'];

const USE_CASES = [
  { icon: Workflow,  title: 'Freelance projects',   body: 'Milestone-based payment for design, development, and content work — funded up front, released on delivery.' },
  { icon: Store,     title: 'Marketplace payouts',  body: 'Hold buyer funds while a marketplace order is fulfilled, then release to the seller on confirmation.' },
  { icon: Handshake, title: 'B2B transactions',     body: 'Two companies with no prior relationship can transact without either side fronting the whole risk.' },
  { icon: Globe,     title: 'Domains & websites',   body: 'High-value domain and site transfers with a neutral mediator on standby for the handover.' },
  { icon: KeyRound,  title: 'Licenses & accounts',  body: 'Software licenses, activation keys, and account transfers delivered against locked escrow.' },
  { icon: Package,   title: 'Digital products',     body: 'Source code, designs, templates, and downloadable goods where delivery needs to be verified.' },
];

const WITHOUT = ['Send first and hope the other side delivers','No recourse if a counterparty disappears','Disputes turn into your word against theirs','Funds gone the moment you hit send'];
const WITH_US = ['Funds held safely in escrow until terms are met','A neutral mediator resolves any dispute','Every step recorded in a tamper-evident ledger','Release only when both sides have delivered'];

const TRUST_POINTS = [
  { icon: Zap,         label: 'Confirmed funding',            desc: 'Deals only advance once funding is verified.' },
  { icon: Lock,        label: 'Dual-control on large payouts', desc: 'Two approvers required before any release.' },
  { icon: Database,    label: 'Hash-chained audit log',        desc: 'Every state change cryptographically signed.' },
  { icon: ShieldCheck, label: 'Envelope-encrypted PII',        desc: 'Emails and addresses AES-256-GCM encrypted.' },
];

// Roadmap only. Nothing in this list is live today — keep it labelled that way.
const AI_ROADMAP = [
  { icon: Search, title: 'Fraud & risk scoring',    body: 'Score new deals and counterparties on behavioural signals so high-risk transactions get extra verification before funding.' },
  { icon: Brain,  title: 'Dispute assistance',       body: 'Summarise the evidence on a disputed deal and surface the relevant clauses, so a human mediator decides faster and more consistently.' },
  { icon: FileCheck, title: 'Terms drafting',        body: 'Turn a plain-language description of a project into clear, structured milestones and acceptance criteria.' },
];

const FAQ = [
  { q: 'How does escrow protect me?', a: 'Funds are held in escrow and only released when both parties have met the agreed terms. Neither side can walk away with the money, and a neutral mediator is always on standby.' },
  { q: 'How does payment and settlement work?', a: 'Deals are currently funded and settled in digital assets (USDT, ETH, BNB, SOL, TRX) across Ethereum, BNB Chain, TRON, and Solana. Full details are on the crypto settlement page. Additional settlement rails are on the roadmap.' },
  { q: 'What are the fees?', a: 'A sliding-scale platform fee from 5% down to 1.35% with a $30 minimum, plus a 0.5% seller settlement fee. Network costs are passed through at cost.' },
  { q: 'What deal sizes are supported?', a: '$400 to $50,000 per deal. The fee tier automatically gets cheaper as deal size grows.' },
  { q: 'What happens if there is a dispute?', a: 'Either side can open a dispute. A neutral mediator reviews the evidence, applies the written terms, and issues a final decision — release, refund, or partial settlement — all recorded in the ledger.' },
  { q: 'Does TrustVexa use AI?', a: 'Not yet. Fraud scoring, dispute assistance, and terms drafting are on our roadmap and are clearly marked as planned rather than shipped.' },
];

export default function HomePage() {
  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <AuroraBackground />
        <ParticleField count={45} className="opacity-40" />
        <div className="container grid items-center gap-10 py-16 md:py-24 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col items-start gap-5">
            <Reveal><ActivityTicker /></Reveal>
            <Reveal delay={60}>
              <span className="eyebrow mt-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                Milestone-based · automated · dispute-ready
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
                Secure escrow infrastructure for <span className="text-gradient-shine">freelancers</span> and marketplaces
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="max-w-lg text-base text-muted-foreground md:text-lg">
                TrustVexa is the trust layer for online transactions. Funds are held in escrow and released against milestones, so neither side has to go first on trust — with a neutral mediator if a deal goes sideways.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="xl" variant="gradient">
                  <Link href="/register">Start a deal <ArrowRight className="h-5 w-5" aria-hidden /></Link>
                </Button>
                <Button asChild size="xl" variant="outline">
                  <Link href="/how-it-works">See how it works</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Funds held in escrow</span>
                <span className="inline-flex items-center gap-1.5"><Workflow className="h-4 w-4 text-primary" aria-hidden /> Milestone releases</span>
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-warning" aria-hidden /> $400 – $50,000 deals</span>
                <span className="inline-flex items-center gap-1.5"><Scale className="h-4 w-4 text-muted-foreground" aria-hidden /> Neutral mediation</span>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200} className="flex justify-center lg:justify-end">
            <div className="perspective">
              <TiltCard intensity={8}><HeroEscrowCard /></TiltCard>
            </div>
          </Reveal>
        </div>
        <div className="container pb-8">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Built for the people who transact online
          </p>
          <Marquee>
            {AUDIENCES.map((item) => (
              <span key={item} className="flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-2 font-mono text-sm font-medium text-muted-foreground">
                <Boxes className="h-4 w-4 text-primary" aria-hidden />{item}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ─── QUICK STATS BAR ──────────────────────────────────────────────── */}
      <section className="border-y bg-card/40">
          <div className="container grid grid-cols-2 gap-3 py-6 md:grid-cols-4 md:py-8">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center">
              <p className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                <span className="text-gradient">
                  <CountUp end={stat.value} suffix={stat.suffix ?? ''} decimals={stat.decimals ?? 0} />
                </span>
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{stat.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── DEAL TIMELINE ────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Zap className="h-3.5 w-3.5" aria-hidden /> See it live</>}
              title="Watch a deal move through escrow"
              subtitle="Four clear stages. No step skipped, no cent unaccounted for."
            />
          </Reveal>
          <Reveal delay={100} className="mt-8 flex justify-center">
            <div className="w-full max-w-2xl rounded-2xl border bg-card/60 px-4 py-6 sm:px-8 sm:py-10 shadow-glow backdrop-blur">
              <DealTimelineSvg />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Each node pulses when that stage is active. The traveling dot shows value moving through the deal.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><UserPlus className="h-3.5 w-3.5" aria-hidden /> Simple by design</>}
              title="How escrow works"
              subtitle="Four clear steps keep both sides protected — money only moves when everyone has done their part."
            />
          </Reveal>
          <div className="relative mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 90}>
                <div className="group relative flex h-full flex-col gap-3 rounded-2xl border bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                    <step.icon className="h-5 w-5" aria-hidden />
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-bold">{i + 1}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LEDGER + SECURITY ────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow"><Database className="h-3.5 w-3.5" aria-hidden /> Cryptographic accounting</span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">A double-entry ledger that cannot be tampered with</h2>
            <p className="mt-4 text-muted-foreground">Every movement of value is recorded as a balanced pair of debits and credits. No cent appears or disappears — the ledger is always in equilibrium.</p>
            <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
              {TRUST_POINTS.map((p) => (
                <div key={p.label} className="flex items-start gap-3 rounded-xl border bg-card/60 p-3">
                  <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold">{p.label}</p>
                    <p className="text-[11px] text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <div className="flex flex-col items-center gap-8">
            <Reveal delay={100} className="flex justify-center"><SecurityRing /></Reveal>
            <Reveal delay={150} className="w-full"><LedgerStack /></Reveal>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Why TrustVexa</>}
              title="Built for trust, end to end"
              subtitle="Every layer is designed to keep funds safe and the terms of a deal enforceable."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 80}>
                <div className="card-glow group h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <feature.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-display text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── USE CASES ────────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Boxes className="h-3.5 w-3.5" aria-hidden /> Who it is for</>}
              title="Built for high-value online transactions"
              subtitle="From freelance milestones to marketplace payouts, TrustVexa secures the deals that are too risky to do on a handshake."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={(i % 3) * 80}>
                <div className="group flex h-full items-start gap-4 rounded-2xl border bg-card/60 p-5 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <u.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-semibold">{u.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI ROADMAP (clearly labelled as not yet shipped) ─────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Brain className="h-3.5 w-3.5" aria-hidden /> On the roadmap</>}
              title="Where AI fits into escrow"
              subtitle="None of the following is live yet. These are the three places where we believe machine learning genuinely improves an escrow product, and they are what we are building next."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {AI_ROADMAP.map((item, i) => (
              <Reveal key={item.title} delay={i * 90}>
                <div className="flex h-full flex-col rounded-2xl border border-dashed bg-card/60 p-6 backdrop-blur">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Planned
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <ParticleField count={20} className="opacity-15" />
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Scale className="h-3.5 w-3.5" aria-hidden /> The difference</>}
              title="Why escrow beats transacting on trust"
              subtitle="The same deal, with and without a neutral party holding the funds."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-7">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive"><X className="h-5 w-5" /></span>
                  <h3 className="font-display text-base font-semibold">Transacting directly</h3>
                </div>
                <ul className="space-y-2.5">
                  {WITHOUT.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card-glow h-full rounded-2xl border bg-card p-7 shadow-glow">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white"><ShieldCheck className="h-5 w-5" /></span>
                  <h3 className="font-display text-base font-semibold">With TrustVexa</h3>
                </div>
                <ul className="space-y-2.5">
                  {WITH_US.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─────────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <FeatureSplit
            reverse
            eyebrow={<><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Security first</>}
            title="Your money is protected at every step"
            body="Funds are confirmed before a deal advances, held in escrow, and released only when both sides have delivered. Sensitive data is encrypted, and every movement is recorded in a tamper-evident ledger."
            points={['Verified funding before delivery','Encrypted, private deal details','Hash-chained audit trail','Dual-control on large payouts']}
            visual={<ShieldVisual />}
          />
        </div>
      </section>

      {/* ─── BOTH SIDES ───────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Scale className="h-3.5 w-3.5" aria-hidden /> Fair to everyone</>}
              title="Protection for both sides of the deal"
              subtitle="Escrow balances the risk so neither side has to go first on trust."
            />
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="card-glow h-full rounded-2xl border bg-card p-7 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500"><ShoppingCart className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold">For buyers</h3>
                </div>
                <ul className="space-y-2.5">
                  {['Your funds stay in escrow until you approve delivery','Inspect the work or asset before release','Open a dispute with a neutral mediator any time','Refunded automatically if a deal expires unfunded'].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="card-glow h-full rounded-2xl border bg-card p-7 shadow-soft">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500"><Store className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-semibold">For sellers</h3>
                </div>
                <ul className="space-y-2.5">
                  {['See funds confirmed before you deliver','Inspection window auto-releases if the buyer goes silent','Clear, predictable payout on completion','Every step logged — good-faith delivery is provable'].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── DEAL FLOW ────────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><ArrowRight className="h-3.5 w-3.5 rotate-45" aria-hidden /> See it in action</>}
              title="Funds flow through escrow — never off-platform"
              subtitle="Every cent moves along a verified path. No shortcuts."
            />
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <div className="rounded-2xl border bg-card/60 p-6 shadow-soft backdrop-blur md:p-10">
              <DealFlowSvg />
              <div className="mt-7 grid gap-4 grid-cols-1 sm:grid-cols-3">
                {[{step:'01',title:'Funded escrow',body:'Buyer funds a unique per-deal address. Confirmed before the deal advances.'},{step:'02',title:'Verified delivery',body:'Seller delivers. Buyer inspects within the agreed window.'},{step:'03',title:'Recorded release',body:'Payout is executed and recorded, with a receipt available to both sides.'}].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="font-display text-2xl font-bold text-gradient opacity-60">{s.step}</span>
                    <div>
                      <p className="font-display text-sm font-semibold">{s.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── SETTLEMENT DISCLOSURE ────────────────────────────────────────── */}
      <section className="section relative overflow-hidden border-t">
        <div className="container max-w-4xl">
          <Reveal>
            <div className="flex flex-col gap-4 rounded-2xl border bg-card/60 p-7 backdrop-blur sm:flex-row sm:items-center sm:gap-7">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Coins className="h-6 w-6" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-display text-lg font-semibold">How deals are funded today</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Escrow deals are currently funded and settled in digital assets across four networks. The mechanics, supported assets, confirmation rules, and network costs are all documented on the settlement page.
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/crypto">Settlement details <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-3xl">
          <Reveal>
            <SectionHeading title="Frequently asked questions" subtitle="Everything you need to know before your first deal." />
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <FaqAccordion items={FAQ} />
          </Reveal>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container">
          <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border bg-brand-gradient p-6 text-center text-white shadow-glow-lg sm:p-10 md:p-14">
              <div aria-hidden className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
              <ParticleField count={30} className="opacity-20" />
              <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
                  <Sparkles className="h-4 w-4" aria-hidden /> Start transacting safely today
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready to make your first safe deal?</h2>
                <p className="text-white/80">Create your account in minutes and open a milestone-based escrow deal with anyone you work with.</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button asChild size="xl" className="bg-white text-primary hover:bg-white/90">
                    <Link href="/register">Create free account <ArrowRight className="h-5 w-5" aria-hidden /></Link>
                  </Button>
                  <Button asChild size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                    <Link href="/fees">See fee calculator</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
