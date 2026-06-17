'use client';

import { ArrowDownRight, Check, Lock, ShieldCheck, Zap } from 'lucide-react';

/**
 * 3D floating card stack that illustrates the double-entry ledger concept.
 * Three overlapping cards float at different depths and speeds.
 */
export function LedgerStack() {
  return (
    <div className="relative mx-auto h-80 w-72 md:h-96 md:w-80" aria-hidden="true">
      {/* Glow base */}
      <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-glow-pulse" />

      {/* Card C — back, lowest depth */}
      <div className="absolute bottom-4 left-2 right-2 rounded-2xl border border-border bg-card/50 p-5 shadow-card backdrop-blur animate-card-float-c">
        <div className="flex items-center gap-2 opacity-60">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent">
            <Zap className="h-4 w-4" />
          </span>
          <span className="text-xs font-mono font-medium text-muted-foreground">Release · Ethereum</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Payout</p>
            <p className="font-display text-xl font-bold">11,875 USDT</p>
          </div>
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold text-success">Confirmed</span>
        </div>
      </div>

      {/* Card B — middle depth */}
      <div className="absolute bottom-12 left-0 right-0 rounded-2xl border border-border bg-card/70 p-5 shadow-soft backdrop-blur animate-card-float-b">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Lock className="h-4 w-4" />
          </span>
          <span className="text-xs font-mono font-medium text-muted-foreground">Escrow · TRON</span>
        </div>
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">Held in escrow</p>
          <p className="font-display text-xl font-bold">4,200 USDT</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-3/4 rounded-full bg-brand-gradient" />
          </div>
        </div>
      </div>

      {/* Card A — top, highest depth */}
      <div className="absolute bottom-20 -left-4 right-4 rounded-2xl border bg-card p-5 shadow-glow-lg backdrop-blur-xl card-glow animate-card-float-a">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold">Double-entry ledger</p>
              <p className="text-[10px] text-muted-foreground">Balanced · #TVX-3E9F</p>
            </div>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Dr  hot_wallet_asset', value: '+12,500', dir: 'debit' },
            { label: 'Cr  escrow_liability', value: '-12,500', dir: 'credit' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{row.label}</span>
              <span className={`font-mono text-[11px] font-semibold ${row.dir === 'debit' ? 'text-primary' : 'text-success'}`}>{row.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <ArrowDownRight className="h-3 w-3 text-success" />
          <span>Each group balances to zero — no cent lost</span>
        </div>
      </div>
    </div>
  );
}
