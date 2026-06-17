import { Check, Lock, ShieldCheck } from 'lucide-react';

/** Stylized escrow-deal preview card used as the hero illustration. */
export function HeroEscrowCard() {
  return (
    <div className="relative w-full max-w-md">
      {/* Floating badges */}
      <div className="absolute -left-6 top-10 z-20 hidden animate-float rounded-2xl border border-border bg-card/90 p-3 shadow-card backdrop-blur sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <Check className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold">Funds released</p>
            <p className="text-[11px] text-muted-foreground">to seller wallet</p>
          </div>
        </div>
      </div>

      <div className="absolute -right-4 bottom-16 z-20 hidden animate-float animation-delay-400 rounded-2xl border border-border bg-card/90 p-3 shadow-card backdrop-blur sm:block">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Lock className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold">Escrow locked</p>
            <p className="text-[11px] text-muted-foreground">on-chain verified</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="card-glow relative overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-glow-lg backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Escrow Deal</p>
              <p className="font-mono text-[11px] text-muted-foreground">#TVX-9F2A41</p>
            </div>
          </div>
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
            In escrow
          </span>
        </div>

        <div className="mt-6 rounded-2xl bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Deal amount</p>
          <p className="font-display text-3xl font-bold tracking-tight">$12,500.00</p>
          <p className="mt-1 text-xs text-muted-foreground">≈ 12,500 USDT · Ethereum</p>
        </div>

        <div className="mt-5 space-y-3">
          {[
            { label: 'Deal created', done: true },
            { label: 'Buyer funded escrow', done: true },
            { label: 'Seller delivering', done: false },
            { label: 'Release to seller', done: false },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <span
                className={
                  step.done
                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground'
                    : i === 2
                      ? 'relative flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground'
                      : 'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground'
                }
              >
                {step.done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[11px] font-semibold">{i + 1}</span>
                )}
                {i === 2 ? (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/40" />
                ) : null}
              </span>
              <span
                className={
                  step.done || i === 2 ? 'text-sm font-medium' : 'text-sm text-muted-foreground'
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-brand-gradient" />
        </div>
      </div>
    </div>
  );
}
