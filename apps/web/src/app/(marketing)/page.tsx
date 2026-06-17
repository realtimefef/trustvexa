import Link from 'next/link';
import {
  ArrowRight, AtSign, BadgeCheck, Boxes, Check, Coins, Database,
  EyeOff, Gamepad2, Gavel, Globe, KeyRound, Lock, Package, Scale,
  ShieldCheck, ShoppingCart, Sparkles, Star, Store, UserPlus,
  Wallet, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityTicker } from '@/components/visual/activity-ticker';
import { AuroraBackground } from '@/components/visual/aurora-background';
import { BlockchainGlobe } from '@/components/visual/blockchain-globe';
import { CoinOrbit } from '@/components/visual/coin-orbit';
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
  { icon: Wallet,      title: 'Create a deal',     body: 'Set amount, coin, network. Invite counterparty with a single-use link and 48-digit verification code.' },
  { icon: Lock,        title: 'Buyer funds escrow', body: 'Buyer sends crypto to the escrow address. Funds confirmed on-chain at required depth before the deal proceeds.' },
  { icon: ShieldCheck, title: 'Seller delivers',    body: 'Seller delivers the digital product. Buyer inspects within the agreed window, with a neutral middleman on standby.' },
  { icon: Gavel,       title: 'Release or mediate', body: 'On approval funds release to the seller. Disputes trigger the middleman; double-entry ledger keeps every cent accounted for.' },
];
const FEATURES = [
  { icon: Scale,      title: 'Neutral middleman',  body: 'A human mediator resolves disputes fairly with full audit history and agreed terms applied to every decision.' },
  { icon: Globe,      title: 'Multi-chain',         body: 'USDT, ETH, BNB, SOL, TRX across Ethereum, BNB Chain, TRON, and Solana — funded and settled in your chosen coin.' },
  { icon: Coins,      title: 'Transparent fees',    body: 'A clear sliding-scale fee from 5% down to 1.35% with a $30 minimum. No hidden charges, ever.' },
  { icon: Lock,       title: 'Private by design',   body: 'Deal details are envelope-encrypted and middleman presence stays private to protect both sides.' },
  { icon: BadgeCheck, title: 'On-chain proof',      body: 'Every funding and payout is verified on-chain at required confirmation depth, recorded to the smallest unit.' },
  { icon: Database,   title: 'Double-entry ledger', body: 'A tamper-evident ledger accounts for every cent across escrow, fees, and settlement — fully auditable.' },
];
const STATS = [
  { value: 5,    suffix: ' coins',  label: 'Supported assets' },
  { value: 4,    suffix: ' chains', label: 'Networks supported' },
  { value: 1.35, suffix: '%', decimals: 2, label: 'Lowest platform fee' },
  { value: 24,   suffix: '/7',      label: 'Middleman mediation' },
];
const COINS = ['USDT', 'ETH', 'BNB', 'SOL', 'TRX', 'Ethereum', 'BNB Chain', 'TRON', 'Solana'];
const USE_CASES = [
  { icon: AtSign,   title: 'Social media accounts', body: 'Instagram, TikTok, YouTube, X, and Telegram handovers with verification.' },
  { icon: Gamepad2, title: 'Gaming accounts',        body: 'Steam, Epic, Riot and more — transferred only once funds are secured.' },
  { icon: KeyRound, title: 'Software licenses',      body: 'License, serial, and activation keys delivered against locked escrow.' },
  { icon: Package,  title: 'Digital products',       body: 'Source code, designs, templates, and downloadable goods.' },
  { icon: Globe,    title: 'Domains & websites',     body: 'High-value domain and site sales with a neutral middleman on standby.' },
  { icon: Boxes,    title: 'Subscriptions & more',   body: 'Any digital asset where both sides want a safe, on-chain settlement.' },
];
const WITHOUT = ['Send first and hope the other side delivers','No recourse if a counterparty disappears','Disputes turn into your word against theirs','Funds gone the moment you hit send'];
const WITH_US = ['Funds held safely in escrow until terms are met','A neutral middleman mediates any dispute','Every step recorded in a tamper-evident ledger','Release only when both sides have delivered'];
const TESTIMONIALS = [
  { quote: 'TrustVexa made a $20k account sale completely painless. Funds were locked the moment I sent them and released the second I confirmed delivery.', name: 'Marcus T.', role: 'Digital reseller' },
  { quote: 'The middleman stepped in on a disputed delivery and resolved it in hours, not weeks. The audit trail meant there was nothing to argue about.', name: 'Lena K.', role: 'SaaS founder' },
  { quote: 'Fees are transparent and the multi-chain support means I never have to convert coins. This is how crypto escrow should work.', name: 'Devon R.', role: 'Crypto trader' },
];
const TRUST_POINTS = [
  { icon: Zap,         label: 'Instant on-chain confirmation',  desc: 'Funding verified at block-depth — no guessing.' },
  { icon: Lock,        label: 'Dual-control on large payouts',   desc: 'Two approvers required before any broadcast.' },
  { icon: Database,    label: 'Hash-chained audit log',          desc: 'Every state change cryptographically signed.' },
  { icon: ShieldCheck, label: 'Envelope-encrypted PII',          desc: 'Emails and addresses AES-256-GCM encrypted.' },
];
const FAQ = [
  { q: 'How does crypto escrow protect me?', a: 'Funds are held in a secure escrow address and only released when both parties have met the agreed terms. Neither side can run off with the money, and a neutral middleman is always on standby.' },
  { q: 'Which coins and networks are supported?', a: 'USDT, ETH, BNB, SOL, and TRX across Ethereum, BNB Chain, TRON, and Solana. You choose coin and network at deal creation; settlement happens in that same coin.' },
  { q: 'What are the fees?', a: 'A sliding-scale platform fee from 5% down to 1.35% with a $30 minimum, plus a 0.5% seller settlement fee. On-chain gas is passed through at cost.' },
  { q: 'What deal sizes are supported?', a: '$400 to $50,000, settled in your chosen coin. The fee tier automatically gets cheaper as deal size grows.' },
  { q: 'What happens if there is a dispute?', a: 'Either side can open a dispute. A neutral middleman reviews evidence, applies the written terms, and issues a final decision — release, refund, or partial settlement — all recorded in the ledger.' },
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
                Crypto-only escrow · neutral middleman · on-chain verified
              </span>
            </Reveal>
            <Reveal delay={120}>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl xl:text-6xl">
                Trade digital goods <span className="text-gradient-shine">safely</span> with crypto escrow
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="max-w-lg text-base text-muted-foreground md:text-lg">
                TrustVexa holds funds on-chain while you trade digital products and accounts. A neutral middleman keeps both sides protected — every cent accounted for.
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
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-success" aria-hidden /> On-chain verified</span>
                <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-primary" aria-hidden /> Funds protected</span>
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-warning" aria-hidden /> $400 – $50,000 deals</span>
                <span className="inline-flex items-center gap-1.5"><EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden /> No personal info required</span>
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
            Funds and settlement across leading coins and networks
          </p>
          <Marquee>
            {COINS.map((coin) => (
              <span key={coin} className="flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-2 font-mono text-sm font-medium text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" aria-hidden />{coin}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* ─── PRIVACY CALLOUT STRIP ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-t">
        {/* gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" aria-hidden />
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
        <div className="container relative py-7">
          <Reveal>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
              {/* icon badge */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <ShieldCheck className="h-7 w-7" aria-hidden />
              </div>
              {/* headline + body */}
              <div className="flex-1">
                <p className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  🔒 Secure yourself — no private or personal information needed
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Your real name, address, and ID <span className="font-semibold text-foreground">stay completely private</span>. Your counterparty never sees your personal details — everything is encrypted and exchanged only through secure, verified channels.
                </p>
                {/* mobile badges */}
                <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><EyeOff className="h-3.5 w-3.5" aria-hidden /> No ID required</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Lock className="h-3.5 w-3.5" aria-hidden /> Encrypted end-to-end</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Private by design</span>
                </div>
              </div>
              {/* desktop badges */}
              <div className="hidden shrink-0 flex-col gap-2 sm:flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"><EyeOff className="h-4 w-4" aria-hidden /> No ID required</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"><Lock className="h-4 w-4" aria-hidden /> Encrypted end-to-end</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-1.5 text-sm font-medium text-success"><ShieldCheck className="h-4 w-4" aria-hidden /> Private by design</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── QUICK STATS BAR ──────────────────────────────────────────────── */}
      <section className="border-b bg-card/40">
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

      {/* ─── 3D BLOCKCHAIN GLOBE ──────────────────────────────────────────── */}
      <section className="section relative overflow-hidden border-t bg-muted/20">
        <AuroraBackground grid={false} />
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal delay={100} className="order-2 flex justify-center lg:order-1">
            <BlockchainGlobe />
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <span className="eyebrow"><Globe className="h-3.5 w-3.5" aria-hidden /> Multi-chain by design</span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">One platform. Four chains. Five coins.</h2>
            <p className="mt-4 text-muted-foreground">Choose your coin and chain when you create a deal. TrustVexa confirms funding on-chain at the required block depth and settles in the same asset — no surprise conversions, no counterparty risk.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {['USDT on 4 chains','ETH on Ethereum','BNB on BNB Chain','SOL on Solana','TRX on TRON','On-chain verified funding'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-success" aria-hidden />{item}</li>
              ))}
            </ul>
            <Button asChild size="lg" variant="outline" className="mt-6">
              <Link href="/coins">See supported coins <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* ─── DEAL TIMELINE SVG (NEW) ──────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Zap className="h-3.5 w-3.5" aria-hidden /> See it live</>}
              title="Watch a deal move through escrow"
              subtitle="Four clear stages, all verified on-chain. No step skipped, no cent unaccounted for."
            />
          </Reveal>
          <Reveal delay={100} className="mt-8 flex justify-center">
            <div className="w-full max-w-2xl rounded-2xl border bg-card/60 px-4 py-6 sm:px-8 sm:py-10 shadow-glow backdrop-blur">
              <DealTimelineSvg />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Each node pulses when that stage is active. The traveling dot shows real-time value movement.
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

      {/* ─── 3D LEDGER STACK + SECURITY RING (NEW) ────────────────────────── */}
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
              subtitle="Every layer is designed to keep your funds safe and your trades transparent."
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
              eyebrow={<><Boxes className="h-3.5 w-3.5" aria-hidden /> What you can trade</>}
              title="Built for high-value digital trades"
              subtitle="From social accounts to source code, TrustVexa secures the trades that are too risky to do face to face."
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

      {/* ─── COIN ORBIT ───────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20 relative overflow-hidden">
        <AuroraBackground grid={false} />
        <div className="container grid items-center gap-10 lg:grid-cols-2">
          <Reveal className="order-2 lg:order-1">
            <span className="eyebrow"><Globe className="h-3.5 w-3.5" aria-hidden /> Multi-chain by design</span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">Fund and settle across four networks</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">Choose your coin and chain when you create a deal. TrustVexa confirms funding on-chain at the required depth and settles in the same asset — no surprise conversions.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {['USDT on 4 chains','ETH on Ethereum','BNB on BNB Chain','SOL on Solana','TRX on TRON','On-chain verified funding'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-success" aria-hidden />{item}</li>
              ))}
            </ul>
            <Button asChild size="lg" variant="outline" className="mt-6">
              <Link href="/coins">See supported coins <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
          </Reveal>
          <Reveal delay={150} className="order-1 flex justify-center lg:order-2"><CoinOrbit /></Reveal>
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <ParticleField count={20} className="opacity-15" />
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Scale className="h-3.5 w-3.5" aria-hidden /> The difference</>}
              title="Why escrow beats trading on trust"
              subtitle="The same deal, with and without a neutral middleman holding the funds."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-7">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive"><X className="h-5 w-5" /></span>
                  <h3 className="font-display text-base font-semibold">Trading directly</h3>
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
            body="Funds are confirmed on-chain, held in escrow, and released only when both sides have delivered. Sensitive data is encrypted, and every movement is recorded in a tamper-evident ledger."
            points={['On-chain verified funding','Encrypted, private deal details','Hash-chained audit trail','Dual-control on large payouts']}
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
                  {['Your funds stay in escrow until you approve delivery','Inspect the product or account before release','Open a dispute with a neutral middleman any time','Refunded automatically if a deal expires unfunded'].map((p) => (
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
                  {['See funds confirmed on-chain before you hand over','Inspection window auto-releases if buyer goes silent','Clear, predictable payout in your chosen coin','Every step logged — good-faith delivery is provable'].map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />{p}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── DEAL FLOW SVG ────────────────────────────────────────────────── */}
      <section className="section border-t bg-muted/20">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><ArrowRight className="h-3.5 w-3.5 rotate-45" aria-hidden /> See it in action</>}
              title="Funds flow on-chain — never off-platform"
              subtitle="Every cent moves along a cryptographically verified path. No shortcuts."
            />
          </Reveal>
          <Reveal delay={100} className="mt-8">
            <div className="rounded-2xl border bg-card/60 p-6 shadow-soft backdrop-blur md:p-10">
              <DealFlowSvg />
              <div className="mt-7 grid gap-4 grid-cols-1 sm:grid-cols-3">
                {[{step:'01',title:'On-chain escrow',body:'Buyer sends to a unique per-deal address. Confirmed at required depth.'},{step:'02',title:'Verified delivery',body:'Seller hands over to the middleman. Buyer inspects within agreed window.'},{step:'03',title:'Immutable release',body:'Payout broadcast on-chain, tracked with an explorer link for both sides.'}].map((s) => (
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

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="section relative overflow-hidden">
        <AuroraBackground grid={false} />
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow={<><Star className="h-3.5 w-3.5" aria-hidden /> Loved by traders</>}
              title="Trusted on both sides of the deal"
              subtitle="Buyers and sellers rely on TrustVexa to settle high-value digital trades with zero drama."
            />
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <figure className="flex h-full flex-col gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:shadow-glow">
                  <div className="flex gap-0.5 text-warning">
                    {Array.from({length:5}).map((_,s) => <Star key={s} className="h-3.5 w-3.5 fill-current" aria-hidden />)}
                  </div>
                  <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-2.5 border-t pt-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient font-semibold text-white">{t.name.charAt(0)}</span>
                    <span>
                      <span className="block text-sm font-semibold">{t.name}</span>
                      <span className="block text-xs text-muted-foreground">{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          {/* Link to full reviews page */}
          <div className="mt-8 text-center">
            <Link
              href="/testimonials"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
            >
              Read all reviews <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
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
                  <Sparkles className="h-4 w-4" aria-hidden /> Start trading safely today
                </span>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready to make your first safe deal?</h2>
                <p className="text-white/80">Create your account in seconds. No KYC, no minimums — just secure, on-chain escrow for digital goods and accounts.</p>
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
