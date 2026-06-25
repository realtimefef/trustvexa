'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import {
  DEAL_MAX_USD_CENTS,
  DEAL_MIN_USD_CENTS,
  DEFAULT_SPLIT_BUYER_BPS,
  estimateFees,
  estimateGasCents,
  formatBps,
  formatUsdCents,
  NETWORK_GAS,
  type FeePayer,
} from '@/lib/fees';

// Mirror of COIN_NETWORK_SUPPORT from the API schema
const COIN_NETWORK_SUPPORT: Record<string, string[]> = {
  USDT: ['TRON', 'ETH', 'BNB', 'SOLANA'],
  ETH: ['ETH'],
  BNB: ['BNB'],
  SOL: ['SOLANA'],
  TRX: ['TRON'],
};

const COINS = Object.keys(COIN_NETWORK_SUPPORT);

const NETWORK_LABELS: Record<string, string> = {
  ETH: 'Ethereum',
  BNB: 'BNB Chain',
  TRON: 'TRON',
  SOLANA: 'Solana',
};

interface FormState {
  itemDescription: string;
  coin: string;
  network: string;
  amountUsd: string;
  feePayer: FeePayer;
  /** 0–100, maps to splitBuyerBps = splitBuyerPct * 100 */
  splitBuyerPct: number;
  inspectionWindowDays: number;
  terms: string;
  preferredMiddlemanId: string;
  confirmLegal: boolean;
}

const DEFAULT_FORM: FormState = {
  itemDescription: '',
  coin: 'USDT',
  network: 'TRON',
  amountUsd: '1000',
  feePayer: 'buyer',
  splitBuyerPct: DEFAULT_SPLIT_BUYER_BPS / 100, // 50
  inspectionWindowDays: 3,
  terms: '',
  preferredMiddlemanId: '',
  confirmLegal: false,
};

export default function NewDealPage() {
  const router = useRouter();
  const { status, user } = useAuth();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [connectionId, setConnectionId] = React.useState<string | null>(null);
  const [creatorRole, setCreatorRole] = React.useState<'buyer' | 'seller'>('seller');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showTerms, setShowTerms] = React.useState(false);
  const [middlemen, setMiddlemen] = React.useState<
    Array<{ id: string; username: string; rating?: number }>
  >([]);
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const conn = params.get('connection');
    if (conn) setConnectionId(conn);
    const role = params.get('role');
    if (role === 'buyer' || role === 'seller') setCreatorRole(role);
  }, []);

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/deals/new');
    else if (status === 'authenticated' && user?.role === 'middleman') router.replace('/admin');
  }, [status, user, router]);

  React.useEffect(() => {
    let cancelled = false;
    apiRequest<{ middlemen?: Array<{ id: string; username: string; rating?: number }> }>(
      '/middlemen',
      { method: 'GET' },
    )
      .then((res) => {
        if (!cancelled && res.middlemen) setMiddlemen(res.middlemen);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep network valid when coin changes
  React.useEffect(() => {
    const nets = COIN_NETWORK_SUPPORT[form.coin] ?? [];
    if (nets.length > 0 && !nets.includes(form.network)) {
      update({ network: nets[0] ?? 'TRON' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.coin]);

  const amountCents = Math.round(Number.parseFloat(form.amountUsd || '0') * 100);
  const inRange =
    Number.isFinite(amountCents) &&
    amountCents >= DEAL_MIN_USD_CENTS &&
    amountCents <= DEAL_MAX_USD_CENTS;

  const splitBuyerBps = Math.round(form.splitBuyerPct * 100);

  const estimate = inRange
    ? estimateFees(amountCents, form.feePayer, splitBuyerBps, estimateGasCents(form.network))
    : null;

  const allowedNetworks = COIN_NETWORK_SUPPORT[form.coin] ?? [];

  const gasInfo = NETWORK_GAS[form.network];

  const handleNext = () => {
    if (!form.itemDescription.trim()) {
      setFormError('Please enter an item description.');
      return;
    }
    if (!inRange) {
      setFormError(
        `Deal amount must be between ${formatUsdCents(DEAL_MIN_USD_CENTS)} and ${formatUsdCents(DEAL_MAX_USD_CENTS)}.`,
      );
      return;
    }
    setFormError(null);
    setStep(2);
  };

  const handleCreate = async () => {
    if (!form.confirmLegal) {
      setFormError('You must confirm the legal terms before creating a deal.');
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      const created = await apiRequest<{ dealId?: string; id?: string; deal_id?: string }>('/deals', {
        method: 'POST',
        idempotencyKey: newIdempotencyKey(),
        body: {
          coin: form.coin,
          network: form.network,
          productType: 'digital',
          itemDescription: form.itemDescription,
          dealAmountCents: amountCents,
          feePayer: form.feePayer,
          feeSplitBuyerBps: form.feePayer === 'split' ? splitBuyerBps : undefined,
          inspectionWindowDays: form.inspectionWindowDays,
          terms: form.terms || undefined,
          confirmLegal: true,
          preferredMiddlemanId: form.preferredMiddlemanId || undefined,
          connectionId: connectionId || undefined,
          creatorRole: creatorRole,
        },
      });
      // API returns { dealId } (camelCase). Older fallbacks kept for safety.
      const id = created.dealId ?? created.id ?? created.deal_id;
      if (!id) {
        router.push('/dashboard');
        return;
      }
      // When the deal was created from a connection it already has a buyer →
      // go straight to the deal detail ("assigned deal"). When it was created
      // standalone (no buyer/chat yet) → land on the deal detail with the
      // invite flow opened so the seller can invite their counterparty.
      if (connectionId) {
        router.push(`/deals/${id}`);
      } else {
        router.push(`/deals/${id}?invite=1`);
      }
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Unable to create the deal. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step 1: Deal Basics ──────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-8">
      {/* Role picker — always ask whether the creator is the buyer or the
          seller, both when creating from a chat and when starting a deal
          directly (no chat), mirroring the chat's role question. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <span className="text-muted-foreground">{connectionId ? 'Creating from your chat — in this deal I am the:' : 'In this deal, I am the:'}</span>
        {(['buyer', 'seller'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setCreatorRole(r)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors',
              creatorRole === r
                ? 'bg-primary text-primary-foreground'
                : 'border border-border hover:bg-muted/40',
            )}
          >
            {r === 'buyer' ? '🛒 Buyer (I pay)' : '📦 Seller (I deliver)'}
          </button>
        ))}
      </div>

      {/* Item description */}
      <div className="space-y-2">
        <Label htmlFor="itemDescription" className="text-sm font-semibold">
          Item description <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="itemDescription"
          rows={4}
          value={form.itemDescription}
          onChange={(e) => update({ itemDescription: e.target.value })}
          placeholder="What are you selling? Be specific."
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Coin — visual pill buttons */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Coin</Label>
        <div className="flex flex-wrap gap-2">
          {COINS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update({ coin: c })}
              className={cn(
                'rounded-full border px-5 py-2 text-sm font-semibold transition-colors',
                form.coin === c
                  ? 'border-primary bg-primary text-white'
                  : 'border-border hover:border-primary/60 hover:bg-muted/40',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Network — smaller pills auto-filtered by selected coin */}
        <div className="flex flex-wrap gap-1.5 pl-0.5">
          {allowedNetworks.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => update({ network: n })}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                form.network === n
                  ? 'border-primary bg-primary text-white'
                  : 'border-border/70 text-muted-foreground hover:border-primary/60 hover:bg-muted/40',
              )}
            >
              {NETWORK_LABELS[n] ?? n}
            </button>
          ))}
        </div>
      </div>

      {/* Deal amount — large, prominent */}
      <div className="space-y-2">
        <Label htmlFor="amountUsd" className="text-sm font-semibold">
          Deal amount (USD)
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-muted-foreground">
            $
          </span>
          <Input
            id="amountUsd"
            inputMode="decimal"
            value={form.amountUsd}
            onChange={(e) => update({ amountUsd: e.target.value })}
            className="h-14 pl-8 text-2xl font-semibold"
            placeholder="0.00"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Min {formatUsdCents(DEAL_MIN_USD_CENTS)} · Max {formatUsdCents(DEAL_MAX_USD_CENTS)}
        </p>
      </div>

      {/* Fee payer — 3 radio-card options side by side */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Who pays the platform fee?</Label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'buyer' as FeePayer, label: 'Buyer pays' },
              { value: 'seller' as FeePayer, label: 'Seller pays' },
              { value: 'split' as FeePayer, label: 'Split 50/50' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ feePayer: value })}
              className={cn(
                'rounded-xl border p-3 text-center text-sm font-medium transition-colors',
                form.feePayer === value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 hover:bg-muted/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Inline buyer-percent slider shown only for Split */}
        {form.feePayer === 'split' && (
          <div className="space-y-2 rounded-xl border bg-muted/20 p-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Buyer pays {form.splitBuyerPct}%</span>
              <span>Seller pays {100 - form.splitBuyerPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.splitBuyerPct}
              onChange={(e) => update({ splitBuyerPct: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        )}
      </div>

      {/* Fee estimate panel — clean row */}
      {estimate && (
        <div className="rounded-xl border bg-muted/30 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Buyer sends</p>
              <p className="text-sm font-semibold">{formatUsdCents(estimate.buyerSendsCents)}</p>
            </div>
            <span className="hidden text-muted-foreground sm:block">·</span>
            <div>
              <p className="text-xs text-muted-foreground">Seller receives</p>
              <p className="text-sm font-semibold">{formatUsdCents(estimate.sellerReceivesCents)}</p>
            </div>
            <span className="hidden text-muted-foreground sm:block">·</span>
            <div>
              <p className="text-xs text-muted-foreground">
                Platform fee ({formatBps(estimate.appliedBps)})
              </p>
              <p className="text-sm font-semibold">{formatUsdCents(estimate.platformFeeCents)}</p>
            </div>
          </div>
          {gasInfo && (
            <p className="mt-2 text-xs text-muted-foreground">
              + {gasInfo.label} gas {gasInfo.rangeLabel} · Estimate only. Locked at funding.
            </p>
          )}
          {!gasInfo && (
            <p className="mt-2 text-xs text-muted-foreground">Estimate only. Locked at funding.</p>
          )}
        </div>
      )}
    </div>
  );

  // ── Step 2: Review & Create ──────────────────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Summary card — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Item</span>
            <span className="max-w-[60%] text-right">{form.itemDescription}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coin</span>
            <span className="font-medium">{form.coin}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Network</span>
            <span className="font-medium">{NETWORK_LABELS[form.network] ?? form.network}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">
              {form.amountUsd ? `$${parseFloat(form.amountUsd).toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fee payer</span>
            <span>
              {form.feePayer === 'buyer'
                ? 'Buyer pays'
                : form.feePayer === 'seller'
                  ? 'Seller pays'
                  : `Split — Buyer ${form.splitBuyerPct}% / Seller ${100 - form.splitBuyerPct}%`}
            </span>
          </div>
          {estimate && (
            <>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Platform fee ({formatBps(estimate.appliedBps)})
                </span>
                <span>{formatUsdCents(estimate.platformFeeCents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Buyer sends</span>
                <span>{formatUsdCents(estimate.buyerSendsCents)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Seller receives</span>
                <span>{formatUsdCents(estimate.sellerReceivesCents)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimate only. Exact fees locked at funding.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inspection window */}
      <div className="space-y-2">
        <Label htmlFor="inspectionDays" className="text-sm font-semibold">
          Inspection window
        </Label>
        <select
          id="inspectionDays"
          value={form.inspectionWindowDays}
          onChange={(e) => update({ inspectionWindowDays: Number(e.target.value) })}
          className="flex h-10 w-full max-w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={1}>1 day</option>
          <option value={3}>3 days</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
        </select>
      </div>

      {/* Custom terms — collapsible */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowTerms((v) => !v)}
          className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
        >
          {showTerms ? '− Hide custom terms' : '+ Add custom terms'}
        </button>
        {showTerms && (
          <textarea
            id="terms"
            rows={3}
            value={form.terms}
            onChange={(e) => update({ terms: e.target.value })}
            placeholder="Any specific conditions, acceptance criteria, or delivery requirements..."
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* Preferred middleman */}
      <div className="space-y-2">
        <Label htmlFor="middleman" className="text-sm font-semibold">
          Preferred middleman
        </Label>
        <select
          id="middleman"
          value={form.preferredMiddlemanId}
          onChange={(e) => update({ preferredMiddlemanId: e.target.value })}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Auto-assign (recommended)</option>
          {middlemen.map((m) => (
            <option key={m.id} value={m.id}>
              {m.username}
              {m.rating != null ? ` — ★ ${m.rating.toFixed(1)}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Legal confirmation */}
      <label className="flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={form.confirmLegal}
          onChange={(e) => update({ confirmLegal: e.target.checked })}
        />
        <span className="text-sm text-muted-foreground">
          I confirm this deal complies with TrustVexa&apos;s prohibited-items policy and applicable
          law.
        </span>
      </label>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      {/* Heading + step indicator */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {step === 1 ? 'New Deal' : 'Step 2 of 2 — Review'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1
              ? 'Set the basics — coin, amount, and fees.'
              : 'Review before creating your escrow.'}
          </p>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          Step {step} of 2
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
          style={{ width: step === 1 ? '50%' : '100%' }}
        />
      </div>

      {/* Error alert */}
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {step === 1 ? renderStep1() : renderStep2()}

      {/* Navigation buttons */}
      <div className="flex justify-between gap-3 border-t pt-6">
        {step === 2 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormError(null);
              setStep(1);
            }}
          >
            ← Back
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard')}>
            Cancel
          </Button>
        )}

        {step === 1 ? (
          <Button type="button" onClick={handleNext} disabled={!inRange && form.amountUsd !== ''}>
            Next: Review →
          </Button>
        ) : (
          <Button type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create deal →'}
          </Button>
        )}
      </div>
    </div>
  );
}
