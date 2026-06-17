'use client';

import * as React from 'react';
import { ArrowDownRight, ArrowUpRight, Fuel, Info, Wallet } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DEAL_MAX_USD_CENTS,
  DEAL_MIN_USD_CENTS,
  NETWORK_GAS,
  estimateFees,
  estimateGasCents,
  formatBps,
  formatGasPctOfDeal,
  formatGasUsd,
  formatUsdCents,
  type FeePayer,
} from '@/lib/fees';
import { cn } from '@/lib/utils';

const FEE_PAYERS: ReadonlyArray<{ value: FeePayer; label: string; hint: string }> = [
  { value: 'buyer', label: 'Buyer pays', hint: 'The buyer covers the full platform fee.' },
  { value: 'seller', label: 'Seller pays', hint: 'The seller covers the full platform fee.' },
  {
    value: 'split',
    label: 'Split',
    hint: 'Buyer and seller share the platform fee on agreed terms.',
  },
];

const NETWORK_OPTIONS = Object.entries(NETWORK_GAS).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

/** Small pill that marks who bears a line item. */
function Payer({ who }: { who: 'buyer' | 'seller' | 'network' }) {
  const map = {
    buyer: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    seller: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    network: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  } as const;
  const label = { buyer: 'Buyer', seller: 'Seller', network: 'Network' } as const;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        map[who],
      )}
    >
      {label[who]}
    </span>
  );
}

/**
 * Display-only fee estimator that mirrors the plan's Fee Calculator.
 * - Platform fee is one total fee, paid by buyer / seller / split (any ratio).
 * - The 0.5% settlement fee and the live network (gas) fee are ALWAYS deducted
 *   from the seller's payout only.
 * - Buyer view and seller view show the identical breakdown.
 */
export function FeeCalculator({ defaultPayer = 'buyer' }: { defaultPayer?: FeePayer }) {
  const [amountUsd, setAmountUsd] = React.useState('1000');
  const [feePayer, setFeePayer] = React.useState<FeePayer>(defaultPayer);
  const [buyerPercent, setBuyerPercent] = React.useState(50);
  const [network, setNetwork] = React.useState<string>('TRON');
  const [view, setView] = React.useState<'buyer' | 'seller'>('buyer');

  const cents = Math.round(Number.parseFloat(amountUsd || '0') * 100);
  const inRange =
    Number.isFinite(cents) && cents >= DEAL_MIN_USD_CENTS && cents <= DEAL_MAX_USD_CENTS;
  const gasCents = estimateGasCents(network);
  const gasUsd = NETWORK_GAS[network]?.gasUsd ?? 0;
  const est = inRange ? estimateFees(cents, feePayer, buyerPercent * 100, gasCents) : null;

  return (
    <div className="space-y-7">
      {/* Inputs */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deal-amount">Deal amount (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="deal-amount"
              inputMode="decimal"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              className="h-12 pl-7 text-lg font-semibold"
              aria-describedby="deal-amount-help"
            />
          </div>
          <p id="deal-amount-help" className="text-xs text-muted-foreground">
            {formatUsdCents(DEAL_MIN_USD_CENTS)} – {formatUsdCents(DEAL_MAX_USD_CENTS)} per deal.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="network">Settlement network (sets gas)</Label>
          <select
            id="network"
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            className="flex h-12 w-full rounded-lg border border-input bg-background/60 px-3.5 py-2 text-sm shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {NETWORK_OPTIONS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Typical gas {NETWORK_GAS[network]?.rangeLabel} · passed through at cost.
          </p>
        </div>
      </div>

      {/* Fee payer */}
      <div className="space-y-2">
        <Label>Who pays the platform fee?</Label>
        <div className="grid grid-cols-3 gap-2">
          {FEE_PAYERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFeePayer(option.value)}
              className={cn(
                'rounded-xl border px-2 py-3 text-sm font-semibold transition-all',
                feePayer === option.value
                  ? 'border-primary bg-primary/5 text-foreground shadow-glow'
                  : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {FEE_PAYERS.find((p) => p.value === feePayer)?.hint}
        </p>
      </div>

      {/* Split ratio */}
      {feePayer === 'split' ? (
        <div className="rounded-2xl border bg-muted/30 p-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="split-ratio">Platform-fee split</Label>
            <span className="text-sm font-semibold">
              Buyer {buyerPercent}% · Seller {100 - buyerPercent}%
            </span>
          </div>
          <input
            id="split-ratio"
            type="range"
            min={0}
            max={100}
            step={5}
            value={buyerPercent}
            onChange={(e) => setBuyerPercent(Number(e.target.value))}
            className="mt-4 w-full accent-[hsl(var(--primary))]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: '50 / 50', v: 50 },
              { label: '60 / 40', v: 60 },
              { label: '70 / 30', v: 70 },
              { label: '100% buyer', v: 100 },
              { label: '100% seller', v: 0 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setBuyerPercent(p.v)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  buyerPercent === p.v
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The split is whatever the buyer and seller agree to — never forced to 50/50.
          </p>
        </div>
      ) : null}

      {est ? (
        <>
          {/* Big result — buyer sends / seller receives */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setView('buyer')}
              className={cn(
                'rounded-2xl border p-5 text-left transition-all',
                view === 'buyer'
                  ? 'border-primary/40 bg-primary/[0.04] shadow-glow'
                  : 'hover:border-primary/30',
              )}
            >
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5 text-sky-500" /> Buyer sends
              </span>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                {formatUsdCents(est.buyerSendsCents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Deal amount + buyer&apos;s platform share
              </p>
            </button>
            <button
              type="button"
              onClick={() => setView('seller')}
              className={cn(
                'rounded-2xl border p-5 text-left transition-all',
                view === 'seller'
                  ? 'border-primary/40 bg-primary/[0.04] shadow-glow'
                  : 'hover:border-primary/30',
              )}
            >
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500" /> Seller receives
              </span>
              <p className="mt-2 font-display text-3xl font-bold tracking-tight">
                {formatUsdCents(est.sellerReceivesCents)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">After platform share, 0.5% & gas</p>
            </button>
          </div>

          {/* Itemized breakdown */}
          <div className="overflow-hidden rounded-2xl border">
            <div className="border-b bg-muted/30 px-5 py-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Full breakdown
              </span>
            </div>
            <dl className="divide-y text-sm">
              <Row label="Deal amount" value={formatUsdCents(est.dealAmountCents)} strong />

              {/* Platform fee with the buyer/seller shares always shown */}
              <Row
                label={
                  est.platformFeeFloorApplied
                    ? 'Platform fee (min $30)'
                    : `Platform fee (${formatBps(est.appliedBps)})`
                }
                value={formatUsdCents(est.platformFeeCents)}
                strong
              />
              <div className="bg-muted/20">
                <Row
                  indent
                  label={
                    <span className="inline-flex items-center gap-2">
                      Buyer share <Payer who="buyer" />
                    </span>
                  }
                  value={formatUsdCents(est.buyerPlatformShareCents)}
                  muted
                />
                <Row
                  indent
                  label={
                    <span className="inline-flex items-center gap-2">
                      Seller share <Payer who="seller" />
                    </span>
                  }
                  value={formatUsdCents(est.sellerPlatformShareCents)}
                  muted
                />
              </div>

              <Row
                label={
                  <span className="inline-flex items-center gap-2">
                    Seller settlement fee (0.5%) <Payer who="seller" />
                  </span>
                }
                value={formatUsdCents(est.settlementFeeCents)}
              />
              <Row
                label={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Fuel className="h-3.5 w-3.5" aria-hidden="true" /> Network (gas) fee
                    </span>
                    <Payer who="seller" />
                    <span className="text-xs text-muted-foreground">
                      · {NETWORK_GAS[network]?.label}
                    </span>
                  </span>
                }
                value={
                  <span className="text-right">
                    {formatGasUsd(gasUsd)}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ≈ {formatGasPctOfDeal(gasUsd, est.dealAmountCents)} of deal
                    </span>
                  </span>
                }
              />
            </dl>
            <div className="grid grid-cols-2 gap-px border-t bg-border">
              <div className="bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" /> Platform keeps
                </span>
                <p className="mt-1 font-semibold">{formatUsdCents(est.platformKeepsCents)}</p>
              </div>
              <div className="bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Fuel className="h-3.5 w-3.5" /> Network takes
                </span>
                <p className="mt-1 font-semibold">{formatGasUsd(gasUsd)}</p>
              </div>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            The 0.5% settlement fee and the network (gas) fee are deducted from the seller&apos;s
            payout only. A $30 minimum platform fee applies on the smallest deals. Exact figures,
            FX, and live gas are locked server-side at funding.
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Enter an amount between {formatUsdCents(DEAL_MIN_USD_CENTS)} and{' '}
          {formatUsdCents(DEAL_MAX_USD_CENTS)}.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
  indent,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  muted?: boolean;
  strong?: boolean;
  indent?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 py-3', indent && 'pl-9')}>
      <dt className={cn(muted ? 'text-muted-foreground' : '', strong && 'font-semibold')}>
        {indent ? <span className="mr-1 text-muted-foreground">↳</span> : null}
        {label}
      </dt>
      <dd
        className={cn(muted ? 'text-muted-foreground' : 'font-medium', strong && 'font-semibold')}
      >
        {value}
      </dd>
    </div>
  );
}
