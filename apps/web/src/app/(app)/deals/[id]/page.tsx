'use client';
/**
 * Deal detail page — complete role-specific redesign.
 *
 * Buyer, Seller, and Middleman each get a completely separate view.
 * Buyer and Seller do NOT see each other's private details or actions.
 * Middleman sees everything from both sides and all actions.
 */
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDealRoom } from '@/hooks/useDealRoom';
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp,
  Copy, Check, FileText, MessageCircle, Shield,
  Wallet, UserPlus, Send,
  Download, AlertTriangle, Clock,
} from 'lucide-react';

import { DealReviewForm } from '@/components/deal-review-form';
import { DisputeResolveForm } from '@/components/dispute-resolve-form';
import { MilestoneReleasePanel } from '@/components/milestone-release-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { StateBadge } from '@/components/ui/state-badge';
import { PaymentInstructions } from '@/components/payment-instructions';
import { ConfirmationCounter } from '@/components/confirmation-counter';
import { WalletInput } from '@/components/wallet-input';
import { apiRequest, getAccessToken, newIdempotencyKey, ApiError } from '@/lib/api/client';
import type { DealDetail as BaseDealDetail } from '@/lib/api/types';
import { useAuth } from '@/lib/auth/auth-context';
import {
  estimateFees,
  estimateGasCents,
  formatUsdCents,
  type FeePayer,
} from '@/lib/fees';

/** Extended deal detail — includes fields the API returns but the base type omits */
type DealDetail = BaseDealDetail & {
  /** terms are returned by the API from the latest deal_terms snapshot */
  terms?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Which networks each coin can settle on. */
const COIN_NETWORKS: Record<string, string[]> = {
  USDT: ['TRON', 'ETH', 'BNB', 'SOLANA'],
  SOL: ['SOLANA'],
  BNB: ['BNB'],
  ETH: ['ETH'],
  TRX: ['TRON'],
};

const TERMINAL_STATES = new Set([
  'Released', 'Refunded', 'PartiallySettled', 'Cancelled', 'Expired',
]);
const SETTLED_STATES = new Set(['Released', 'Refunded', 'PartiallySettled']);
const POST_LOCK_STATES = new Set([
  'Agreed', 'Verified', 'Confirmed', 'Amended', 'Funded', 'SellerHandover',
  'MiddlemanVerified', 'Delivered', 'Approved', 'PayoutQueued',
  'MilestoneReleased', 'Released', 'Disputed', 'Refunded', 'PartiallySettled',
  'Expired',
]);

// ─── Hooks ────────────────────────────────────────────────────────────────────

interface EscrowAddressView {
  dealId: string; coin: string; network: string; address: string;
  addressPreview: string; explorerAddressUrl: string | null; qrPayload: string;
  networkWarning: string; requiresWrongNetworkAck: boolean;
  exactAmountCoin: string | null; exactAmountSmallestUnit: string | null;
}

interface SellerDetailsData {
  productName: string | null; productDescription: string | null;
  requirements: string | null; deliveryMethod: string | null;
  deliveryInstructions: string | null; estimatedDeliveryTime: string | null;
  additionalNotes: string | null; verifiedByMiddleman: boolean;
  requirementsForBuyer?: string | null;
}

interface BuyerDetailsData {
  receivingPlatform: string | null; receivingAddress: string | null;
  contactEmail: string | null; backupContact: string | null;
  specialInstructions: string | null; suggestions: string | null;
  confirmedByBuyer: boolean; notes?: string | null;
}

interface PartyDetailsResult {
  sellerDetails: SellerDetailsData | null;
  buyerDetails: BuyerDetailsData | null;
}

function useDealDetail(dealId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['deal-detail', dealId], enabled,
    queryFn: () => apiRequest<DealDetail>(`/dashboard/deals/${dealId}`),
  });
}

function useEscrowAddress(dealId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['escrow-address', dealId], enabled,
    queryFn: () => apiRequest<EscrowAddressView>(`/deals/${dealId}/escrow-address`),
    retry: false,
  });
}

function usePartyDetails(dealId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['party-details', dealId], enabled,
    queryFn: async () => {
      try { return await apiRequest<PartyDetailsResult>(`/deals/${dealId}/party-details`); }
      catch { return { sellerDetails: null, buyerDetails: null }; }
    },
  });
}

function useDealDispute(dealId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['deal-dispute', dealId], enabled,
    queryFn: async () => {
      try { return await apiRequest<{ id: string; status: string }>(`/disputes/by-deal/${dealId}`); }
      catch { return null; }
    },
    retry: false,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cents(v: string | null) { const n = Number(v); return v && Number.isFinite(n) ? formatUsdCents(n) : '—'; }
function fmtDate(v: string | null) { if (!v) return '—'; const d = new Date(v); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); }

async function downloadFile(path: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_ORIGIN}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include',
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toPublicUrl(url: string): string {
  if (typeof window === 'undefined') return url;
  try { const p = new URL(url); p.protocol = window.location.protocol; p.host = window.location.host; return p.toString(); }
  catch { return url; }
}

function getRequiredConfirmations(network: string): number {
  const n = network.toUpperCase();
  if (n.includes('ETH')) return 12;
  if (n.includes('BNB')) return 15;
  if (n.includes('TRON') || n.includes('TRX')) return 20;
  if (n.includes('SOLANA') || n.includes('SOL')) return 1;
  return 12;
}

// ─── Deal Status Stepper ──────────────────────────────────────────────────────

const STAGES = ['Created', 'Agreed', 'Funded', 'In Progress', 'Delivered', 'Complete'] as const;

function statusToStage(status: string): number {
  if (['Released', 'PartiallySettled'].includes(status)) return 5;
  if (['Delivered', 'Approved', 'PayoutQueued', 'MilestoneReleased'].includes(status)) return 4;
  if (['Funded', 'SellerHandover', 'MiddlemanVerified'].includes(status)) return 3;
  if (['Agreed', 'Verified', 'Confirmed', 'Amended'].includes(status)) return 2;
  if (['Created', 'Invited'].includes(status)) return 1;
  return 0;
}

function DealStepper({ status }: { status: string }) {
  const isDisputed = status === 'Disputed';
  const isClosed = ['Cancelled', 'Expired', 'Refunded'].includes(status);
  const current = statusToStage(status);

  if (isDisputed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Dispute open — middleman is reviewing</span>
      </div>
    );
  }

  if (isClosed) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-muted border px-4 py-2.5">
        <span className="text-sm font-medium text-muted-foreground">Deal closed — {status}</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-0">
        {STAGES.map((stage, i) => {
          const stageNum = i + 1;
          const done = stageNum < current;
          const active = stageNum === current;
          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-1">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-primary text-primary-foreground' : active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground border'
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : stageNum}
                </div>
                <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>{stage}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={`h-0.5 w-12 mb-4 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-border/30 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button type="button" onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="inline-flex items-center gap-1 rounded-md bg-muted/60 hover:bg-muted px-2 py-1 text-xs transition-colors">
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ActionCard({ title, description, icon: Icon, children, variant = 'default' }: {
  title: string; description?: string; icon?: React.ElementType;
  children: React.ReactNode; variant?: 'default' | 'success' | 'warning';
}) {
  const variantClass = variant === 'success' ? 'border-emerald-500/40 bg-emerald-500/5'
    : variant === 'warning' ? 'border-amber-500/40 bg-amber-500/5'
    : 'border-primary/30 bg-primary/3';
  return (
    <Card className={variantClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DealInfoCollapsible({ deal }: { deal: DealDetail }) {
  const [open, setOpen] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  // Calculate fee estimate client-side for when API values are null (pre-funding)
  const dealCents = Number(deal.dealAmountCents ?? '0');
  const feePayerKey = (deal.feePayer ?? 'buyer') as FeePayer;
  const gasCents = estimateGasCents(deal.network);
  const estimate = dealCents >= 40000 ? estimateFees(dealCents, feePayerKey, 5000, gasCents) : null;

  const buyerSendsDisplay = deal.buyerTotalCents
    ? cents(deal.buyerTotalCents)
    : estimate ? `~${formatUsdCents(estimate.buyerSendsCents)}` : '—';
  const sellerGetsDisplay = deal.sellerPayoutCents
    ? cents(deal.sellerPayoutCents)
    : estimate ? `~${formatUsdCents(estimate.sellerReceivesCents)}` : '—';
  const platformFeeDisplay = deal.platformFeeCents
    ? cents(deal.platformFeeCents)
    : estimate ? `~${formatUsdCents(estimate.platformFeeCents)}` : '—';
  const isEstimate = !deal.buyerTotalCents && !!estimate;

  return (
    <div className="rounded-xl border">
      {/* Always-visible fee summary with real or estimated values */}
      <div className="px-4 py-3 border-b space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Fee summary
          {isEstimate && <span className="ml-1.5 font-normal text-muted-foreground/60 normal-case">(~ estimated · locked at funding)</span>}
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Deal amount</span>
            <span className="font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Fee payer</span>
            <span className="capitalize font-medium">{deal.feePayer ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Platform fee</span>
            <span>{platformFeeDisplay}</span>
          </div>
          {estimate && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Network gas</span>
              <span>~{formatUsdCents(gasCents)}</span>
            </div>
          )}
          <div className="col-span-2 border-t border-border/40 pt-1.5 grid grid-cols-2 gap-x-6">
            <div className="flex justify-between gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">💳 Buyer sends</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{buyerSendsDisplay}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-emerald-600 font-semibold">💰 Seller receives</span>
              <span className="font-bold text-emerald-600">{sellerGetsDisplay}</span>
            </div>
          </div>
        </div>
        {isEstimate && (
          <p className="text-[10px] text-muted-foreground">
            ~ Estimates based on current fee rates. Exact amounts locked when buyer funds the escrow.
            {' '}<a href="/calculator" className="text-primary underline">Open fee calculator →</a>
          </p>
        )}
      </div>

      {/* Expand for full details */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Full deal details &amp; documents</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t px-4 py-3 space-y-1">
          <Row label="Deal ID" value={<span className="font-mono text-xs">{deal.id}</span>} />
          <Row label="Status" value={<StateBadge status={deal.status} />} />
          <Row label="Coin / Network" value={`${deal.coin} · ${deal.network}`} />
          <Row label="Fee payer" value={<span className="capitalize">{deal.feePayer ?? '—'}</span>} />
          <Row label="Seller settlement fee" value={cents(deal.sellerSettlementFeeCents)} />
          {deal.fundBy && <Row label="Fund deadline" value={fmtDate(deal.fundBy)} />}
          {deal.completeBy && <Row label="Complete by" value={fmtDate(deal.completeBy)} />}
          {deal.inspectionUntil && <Row label="Inspection until" value={fmtDate(deal.inspectionUntil)} />}
          {deal.itemDescription && (
            <div className="pt-1.5 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Item</p>
              <p className="text-sm">{deal.itemDescription}</p>
            </div>
          )}
          {deal.terms && (
            <div className="pt-1.5 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">Deal terms</p>
              <p className="text-sm whitespace-pre-wrap">{deal.terms}</p>
            </div>
          )}
          <div className="pt-2 flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" disabled={downloading}
              onClick={() => { setDownloading(true); void downloadFile(`/documents/deals/${deal.id}/agreement.pdf`, `agreement-${deal.id.slice(0,8)}.pdf`).finally(() => setDownloading(false)); }}>
              <Download className="h-3.5 w-3.5 mr-1" /> Agreement PDF
            </Button>
            {SETTLED_STATES.has(deal.status) && (
              <Button variant="outline" size="sm" disabled={downloading}
                onClick={() => { setDownloading(true); void downloadFile(`/documents/deals/${deal.id}/receipt.pdf`, `receipt-${deal.id.slice(0,8)}.pdf`).finally(() => setDownloading(false)); }}>
                <Download className="h-3.5 w-3.5 mr-1" /> Receipt PDF
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChatLink() {
  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Chat</span>
        <span className="text-xs text-muted-foreground">with your counterparty and middleman</span>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/messages"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Open chat</Link>
      </Button>
    </div>
  );
}

// ─── Seller Details Form ──────────────────────────────────────────────────────

function SellerDetailsForm({ dealId, existing, onSaved }: {
  dealId: string; existing: SellerDetailsData | null; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [productName, setProductName] = React.useState(existing?.productName ?? '');
  const [productDescription, setProductDescription] = React.useState(existing?.productDescription ?? '');
  const [requirements, setRequirements] = React.useState(existing?.requirementsForBuyer ?? existing?.requirements ?? '');
  const [deliveryMethod, setDeliveryMethod] = React.useState(existing?.deliveryMethod ?? 'Chat');
  const [deliveryInstructions, setDeliveryInstructions] = React.useState(existing?.deliveryInstructions ?? '');
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = React.useState(existing?.estimatedDeliveryTime ?? '');
  const [additionalNotes, setAdditionalNotes] = React.useState(existing?.additionalNotes ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await apiRequest(`/deals/${dealId}/seller-details`, { method: 'POST', idempotencyKey: newIdempotencyKey(),
        body: { productName, productDescription, requirementsForBuyer: requirements, deliveryMethod, deliveryInstructions, estimatedDeliveryTime, additionalNotes } });
      setSuccess(true);
      void qc.invalidateQueries({ queryKey: ['party-details', dealId] });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <ActionCard title="Your product & delivery details" description="This info is only visible to the middleman — not to the buyer." icon={Send}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sd-name">Product name</Label>
            <Input id="sd-name" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Name of what you're selling" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-method">How do you deliver?</Label>
            <select id="sd-method" value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="Chat">Chat (via deal chat — default)</option>
              <option value="Email">Email</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sd-desc">Product description</Label>
          <textarea id="sd-desc" rows={2} value={productDescription} onChange={e => setProductDescription(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Describe exactly what the buyer receives" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sd-reqs">Requirements from buyer</Label>
          <textarea id="sd-reqs" rows={2} value={requirements} onChange={e => setRequirements(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="What does the buyer need to provide?" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sd-instructions">Delivery instructions</Label>
          <textarea id="sd-instructions" rows={2} value={deliveryInstructions} onChange={e => setDeliveryInstructions(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Exactly how will delivery happen?" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sd-time">Estimated delivery time</Label>
            <Input id="sd-time" value={estimatedDeliveryTime} onChange={e => setEstimatedDeliveryTime(e.target.value)} placeholder="e.g. Within 24 hours" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-notes">Additional notes</Label>
            <Input id="sd-notes" value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Any caveats or notes" />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-600">✓ Details saved successfully.</p>}
        <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save my details'}</Button>
      </div>
    </ActionCard>
  );
}

// ─── Buyer Details Form ───────────────────────────────────────────────────────

function BuyerDetailsForm({ dealId, existing, onSaved }: {
  dealId: string; existing: BuyerDetailsData | null; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [platform, setPlatform] = React.useState(existing?.receivingPlatform ?? 'Chat');
  const [address, setAddress] = React.useState(existing?.receivingAddress ?? '');
  const [email, setEmail] = React.useState(existing?.contactEmail ?? '');
  const [backup, setBackup] = React.useState(existing?.backupContact ?? '');
  const [instructions, setInstructions] = React.useState(existing?.specialInstructions ?? '');
  const [notes, setNotes] = React.useState(existing?.suggestions ?? existing?.notes ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await apiRequest(`/deals/${dealId}/buyer-details`, { method: 'POST', idempotencyKey: newIdempotencyKey(),
        body: { receivingPlatform: platform, receivingAddress: address, contactEmail: email, backupContact: backup, specialInstructions: instructions, suggestions: notes } });
      setSuccess(true);
      void qc.invalidateQueries({ queryKey: ['party-details', dealId] });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <ActionCard title="Your receiving details" description="Tell the seller where to deliver. Only the middleman can see this — not the seller." icon={Wallet}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bd-platform">How to receive?</Label>
            <select id="bd-platform" value={platform} onChange={e => setPlatform(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="Chat">Chat (via deal chat — default)</option>
              <option value="Email">Email</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bd-address">Your {platform} address</Label>
            <Input id="bd-address" value={address} onChange={e => setAddress(e.target.value)} placeholder={`Your ${platform} to receive at`} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="bd-email">Contact email</Label>
            <Input id="bd-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bd-backup">Backup contact</Label>
            <Input id="bd-backup" value={backup} onChange={e => setBackup(e.target.value)} placeholder="Alternative contact method" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bd-instructions">Special instructions</Label>
          <textarea id="bd-instructions" rows={2} value={instructions} onChange={e => setInstructions(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Any special delivery instructions" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bd-notes">Notes / suggestions for seller</Label>
          <textarea id="bd-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Any notes or suggestions" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-600">✓ Details saved successfully.</p>}
        <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save my details'}</Button>
      </div>
    </ActionCard>
  );
}

// ─── Edit deal before lock ────────────────────────────────────────────────────

function EditDealCard({ dealId, deal, onSaved }: { dealId: string; deal: DealDetail; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [desc, setDesc] = React.useState(deal.itemDescription ?? '');
  const [termsText, setTermsText] = React.useState(deal.terms ?? '');
  const [amount, setAmount] = React.useState(deal.dealAmountCents ? (Number(deal.dealAmountCents) / 100).toFixed(2) : '');
  const [coin, setCoin] = React.useState(deal.coin);
  const [network, setNetwork] = React.useState(deal.network);
  const [feePayer, setFeePayer] = React.useState<'buyer' | 'seller' | 'split'>((deal.feePayer as 'buyer' | 'seller' | 'split') ?? 'buyer');
  const [feeSplitPct, setFeeSplitPct] = React.useState(deal.feeSplitBuyerBps != null ? Math.round(deal.feeSplitBuyerBps / 100) : 50);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const availableNetworks = COIN_NETWORKS[coin] ?? [deal.network];

  const save = async () => {
    setSaving(true); setErr(null); setOk(false);
    const amountCents = Math.round(Number(amount) * 100);
    if (!amount || isNaN(amountCents) || amountCents < 40000 || amountCents > 5_000_000) {
      setErr('Amount must be between $400 and $50,000.'); setSaving(false); return;
    }
    try {
      await apiRequest(`/deals/${dealId}`, {
        method: 'PATCH',
        body: {
          dealAmountCents: amountCents,
          coin,
          network,
          feePayer,
          ...(feePayer === 'split' ? { feeSplitBuyerBps: feeSplitPct * 100 } : { feeSplitBuyerBps: null }),
          itemDescription: desc.trim() || null,
          ...(termsText.trim() ? { terms: termsText.trim() } : {}),
        },
      });
      setOk(true); setOpen(false); onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="rounded-xl border">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          Edit deal details
          <span className="text-xs text-muted-foreground">(before both parties agree)</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Item description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Item / deal description</Label>
            <Input id="edit-desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What is being bought/sold?" />
          </div>

          {/* Amount + Fee payer */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Deal amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input id="edit-amount" value={amount} onChange={e => setAmount(e.target.value)}
                  className="pl-6" placeholder="1000.00" type="number" min="400" max="50000" step="0.01" />
              </div>
              <p className="text-xs text-muted-foreground">Min $400 · Max $50,000</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-feepayer">Who pays platform fee?</Label>
              <select id="edit-feepayer" value={feePayer} onChange={e => setFeePayer(e.target.value as 'buyer' | 'seller' | 'split')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="buyer">Buyer pays all fees</option>
                <option value="seller">Seller pays all fees</option>
                <option value="split">Split fees between both</option>
              </select>
            </div>
          </div>

          {/* Fee split slider */}
          {feePayer === 'split' && (
            <div className="space-y-2 rounded-lg bg-muted/30 border px-3 py-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Fee split</span>
                <span className="text-muted-foreground">Buyer: <strong>{feeSplitPct}%</strong> · Seller: <strong>{100 - feeSplitPct}%</strong></span>
              </div>
              <input type="range" min={0} max={100} step={5} value={feeSplitPct} onChange={e => setFeeSplitPct(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% buyer (seller pays all)</span>
                <span>50/50</span>
                <span>100% buyer (buyer pays all)</span>
              </div>
            </div>
          )}

          {/* Coin + Network */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-coin">Cryptocurrency</Label>
              <select id="edit-coin" value={coin} onChange={e => {
                const c = e.target.value;
                setCoin(c);
                const nets = COIN_NETWORKS[c] ?? [];
                if (!nets.includes(network)) setNetwork(nets[0] ?? '');
              }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {Object.keys(COIN_NETWORKS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-network">Network</Label>
              <select id="edit-network" value={network} onChange={e => setNetwork(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {availableNetworks.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-terms">Deal terms <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <textarea id="edit-terms" rows={3} value={termsText} onChange={e => setTermsText(e.target.value)}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Conditions, deliverables, acceptance criteria…" />
          </div>

          {err && <p className="text-xs text-destructive">⚠️ {err}</p>}
          {ok && <p className="text-xs text-emerald-600">✓ Deal updated successfully.</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="flex-1">{saving ? 'Saving…' : 'Save changes'}</Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Deal step helpers ────────────────────────────────────────────────────────

function StepLabel({ step, total, label }: { step: number; total: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
      <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">Step {step}/{total}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function NoRollbackBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span><strong>No rollback:</strong> {text}</span>
    </div>
  );
}

function NextStep({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
      <span className="font-semibold text-primary shrink-0">Next →</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

// ─── SELLER VIEW ──────────────────────────────────────────────────────────────

interface SellerViewProps {
  deal: DealDetail;
  dealId: string;
  partyDetails: PartyDetailsResult | undefined;
  qc: ReturnType<typeof useQueryClient>;
}

function SellerView({ deal, dealId, partyDetails, qc }: SellerViewProps) {
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [inviteErr, setInviteErr] = React.useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = React.useState(false);
  const [submittingHandover, setSubmittingHandover] = React.useState(false);
  const [handoverErr, setHandoverErr] = React.useState<string | null>(null);
  const [handoverOk, setHandoverOk] = React.useState(false);
  const [payoutAddr, setPayoutAddr] = React.useState('');
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payMsg, setPayMsg] = React.useState<string | null>(null);
  const [payErr, setPayErr] = React.useState<string | null>(null);
  const [mmErr, setMmErr] = React.useState<string | null>(null);
  const [requestingMm, setRequestingMm] = React.useState(false);
  const [agreeing, setAgreeing] = React.useState(false);
  const [agreeErr, setAgreeErr] = React.useState<string | null>(null);
  const [agreedResult, setAgreedResult] = React.useState<{ sellerAgreed: boolean; buyerAgreed: boolean; locked: boolean } | null>(null);

  const generateInvite = async () => {
    setInviting(true); setInviteErr(null);
    try {
      const r = await apiRequest<{ inviteUrl: string }>(`/deals/${dealId}/invites`, { method: 'POST', body: { singleUse: true }, idempotencyKey: newIdempotencyKey() });
      setInviteUrl(r.inviteUrl);
    } catch (err) { setInviteErr(err instanceof Error ? err.message : 'Failed to generate link.'); }
    finally { setInviting(false); }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(toPublicUrl(inviteUrl));
    setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000);
  };

  const savePayout = async () => {
    if (!payoutAddr.trim()) return;
    setPaySubmitting(true); setPayErr(null);
    try {
      await apiRequest(`/deals/${dealId}/payout-wallet`, { method: 'POST', body: { address: payoutAddr.trim() }, idempotencyKey: newIdempotencyKey() });
      setPayMsg('Payout wallet saved. You will be paid here on release.');
    } catch (err) { setPayErr(err instanceof Error ? err.message : 'Failed to save wallet.'); }
    finally { setPaySubmitting(false); }
  };

  // FREE REFUND — seller voluntarily refunds the buyer (no gas deducted)
  const [refunding, setRefunding] = React.useState(false);
  const [refundErr, setRefundErr] = React.useState<string | null>(null);
  const [refundOk, setRefundOk] = React.useState(false);

  const submitHandover = async () => {
    if (!window.confirm('Confirm you have delivered the item to the buyer as agreed? This submits your handover to the middleman for verification.')) return;
    setSubmittingHandover(true); setHandoverErr(null);
    try {
      await apiRequest(`/deals/${dealId}/handover`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      setHandoverOk(true);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) {
      setHandoverErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit handover.');
    } finally { setSubmittingHandover(false); }
  };

  const handleFreeRefund = async () => {
    if (!window.confirm('Issue a free refund to the buyer? This returns the full escrow amount with no fees deducted.')) return;
    setRefunding(true); setRefundErr(null);
    try {
      await apiRequest(`/deals/${dealId}/cancellations`, {
        method: 'POST',
        body: { reason: 'Seller initiated voluntary refund', type: 'seller_requested' },
        idempotencyKey: newIdempotencyKey(),
      });
      setRefundOk(true);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setRefundErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Refund request failed.'); }
    finally { setRefunding(false); }
  };

  const requestMm = async () => {
    setRequestingMm(true); setMmErr(null);
    try {
      await apiRequest(`/deals/${dealId}/request-middleman`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'No middleman available.';
      setMmErr(msg.toLowerCase().includes('unexpected') ? 'No middleman available right now.' : msg);
    } finally { setRequestingMm(false); }
  };

  const handleAgree = async () => {
    setAgreeing(true); setAgreeErr(null);
    try {
      const result = await apiRequest<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean; status: string }>(
        `/deals/${dealId}/agree`, { method: 'POST', idempotencyKey: newIdempotencyKey() }
      );
      setAgreedResult(result);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setAgreeErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to agree.'); }
    finally { setAgreeing(false); }
  };

  // Determine agreement state from the deal itself (survives page refresh)
  // OR from local handleAgree result (for immediate feedback without re-fetching)
  const sellerAlreadyAgreed = !!(deal.sellerAgreedAt) || !!(agreedResult?.sellerAgreed);
  const bothAgreed = !!(deal.lockedAt) || !!(agreedResult?.locked);

  const isPostLock = POST_LOCK_STATES.has(deal.status);
  const counterparty = deal.buyerId ? 'Buyer connected' : 'Waiting for buyer';
  const mmName = deal.middlemanId ? `⚖️ Middleman: ${deal.middlemanId.slice(0,8)}` : 'No middleman yet';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">
            {deal.itemDescription ? `"${deal.itemDescription}"` : `Deal ${dealId.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Seller</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{counterparty} · {mmName}</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <DealStepper status={deal.status} />

      {/* Edit before lock — show as long as the deal isn't locked yet */}
      {!deal.lockedAt && !isPostLock && (
        <EditDealCard dealId={dealId} deal={deal} onSaved={() => void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] })} />
      )}

      {/* Current action — SELLER
          Rule: when deal is locked (bothAgreed), never show the pre-lock "waiting/invite" card;
          jump straight to the Agreed-state card (verification code) even if the DB status
          hasn't been updated yet (data-repair migration + idempotent path will fix it). */}
      {(deal.status === 'Created' || deal.status === 'Invited') && !bothAgreed ? (
        <ActionCard title={deal.buyerId ? 'Waiting for buyer to join' : 'Invite your buyer'} icon={UserPlus}>
          {!deal.buyerId ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Generate a secure invite link and share it with the buyer.</p>
              {inviteErr && <p className="text-xs text-destructive">{inviteErr}</p>}
              {inviteUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input readOnly value={toPublicUrl(inviteUrl)} className="flex-1 rounded-md border bg-muted px-3 py-1.5 text-xs font-mono" onClick={e => (e.target as HTMLInputElement).select()} />
                    <Button size="sm" variant="outline" onClick={copyInvite}>{inviteCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}</Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setInviteUrl(null)}>Generate new link</Button>
                </div>
              ) : (
                <Button onClick={generateInvite} disabled={inviting} className="w-full">{inviting ? 'Generating…' : 'Generate invite link'}</Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Buyer has joined. Waiting for both parties to agree to terms.</p>
          )}
        </ActionCard>
      ) : deal.status === 'Agreed' || deal.status === 'Verified'
          || ((deal.status === 'Created' || deal.status === 'Invited') && bothAgreed) ? (
        <ActionCard title="✓ Deal locked — buyer is preparing to fund" icon={Wallet} variant="success">
          <p className="text-sm text-muted-foreground">Both parties have agreed. The buyer will now fund the escrow. You'll be notified once funds arrive.</p>
          <p className="text-xs text-muted-foreground mt-2">While you wait, fill in your product &amp; delivery details below so the middleman can verify your handover when it's time.</p>
        </ActionCard>
      ) : deal.status === 'Confirmed' || deal.status === 'Amended' ? (
        <ActionCard title="Deal confirmed — save your payout address" icon={Wallet} variant="success">
          <StepLabel step={3} total={6} label="Waiting for buyer to fund escrow" />
          <p className="text-sm text-muted-foreground mb-3">Save where you want to receive payment. The buyer is about to fund the escrow.</p>
          <div className="space-y-2">
            <Label htmlFor="payoutAddr">Your {deal.coin} payout address ({deal.network})</Label>
            <p className="text-xs text-muted-foreground">Double-check the address — payouts are irreversible.</p>
            <div className="flex gap-2">
              <Input id="payoutAddr" value={payoutAddr} onChange={e => setPayoutAddr(e.target.value)} placeholder={`Your ${deal.network} address`} className="flex-1 font-mono text-xs" />
              <Button onClick={savePayout} disabled={paySubmitting || !payoutAddr.trim()}>{paySubmitting ? '…' : 'Save'}</Button>
            </div>
            {payMsg && <p className="text-xs text-emerald-600">{payMsg}</p>}
            {payErr && <p className="text-xs text-destructive">{payErr}</p>}
          </div>
          <NextStep text="Once the buyer funds escrow → you'll be asked to deliver the item and submit a handover to the middleman." />
        </ActionCard>
      ) : deal.status === 'Funded' ? (
        <ActionCard title="Escrow funded — deliver the item now" icon={Send} variant="warning">
          <StepLabel step={4} total={6} label="Seller delivers and submits handover" />
          <p className="text-sm text-muted-foreground">The buyer has paid into escrow. Deliver the item exactly as agreed in the deal terms.</p>
          {!handoverOk ? (
            <div className="mt-3 space-y-3">
              <NoRollbackBanner text="Once you click 'Submit handover', the deal moves to middleman verification. Make sure you have actually delivered before proceeding." />
              {handoverErr && <p className="text-xs text-destructive">⚠️ {handoverErr}</p>}
              <Button onClick={submitHandover} disabled={submittingHandover} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Send className="h-4 w-4 mr-1.5" />
                {submittingHandover ? 'Submitting…' : '✓ I have delivered — submit handover to middleman'}
              </Button>
              <NextStep text="Middleman verifies delivery → buyer inspects → you receive payment." />
            </div>
          ) : (
            <>
              <p className="text-xs text-emerald-600 mt-2">✓ Handover submitted. The middleman is now verifying your delivery.</p>
              <NextStep text="Middleman will confirm delivery → buyer approves → payout released to your wallet." />
            </>
          )}
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Changed your mind? Issue a voluntary refund to the buyer:</p>
            {refundErr && <p className="text-xs text-destructive mb-2">{refundErr}</p>}
            {refundOk && <p className="text-xs text-emerald-600 mb-2">✓ Refund submitted. Buyer receives the full amount.</p>}
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={refunding || refundOk} onClick={handleFreeRefund}>
              {refunding ? 'Processing…' : '↩ Issue free refund to buyer'}
            </Button>
          </div>
        </ActionCard>
      ) : deal.status === 'SellerHandover' ? (
        <ActionCard title="Handover submitted — middleman is verifying" icon={Shield} variant="success">
          <StepLabel step={5} total={6} label="Middleman verification in progress" />
          <p className="text-sm text-muted-foreground">The middleman is reviewing your handover and confirming delivery to the buyer.</p>
          <NextStep text="Once verified → buyer enters their inspection window → approves delivery → payout is sent to you." />
        </ActionCard>
      ) : deal.status === 'MiddlemanVerified' || deal.status === 'Delivered' ? (
        <ActionCard title="Delivery confirmed — waiting for buyer approval" icon={CheckCircle2} variant="success">
          <StepLabel step={5} total={6} label="Buyer is inspecting the delivery" />
          <p className="text-sm text-muted-foreground">Middleman verified your delivery. The buyer is in their inspection window.</p>
          <NextStep text="Once the buyer approves → your payout is released to your wallet immediately." />
        </ActionCard>
      ) : deal.status === 'Approved' || deal.status === 'PayoutQueued' ? (
        <ActionCard title="Payment processing…" icon={Clock} variant="success">
          <StepLabel step={6} total={6} label="Payout in progress" />
          <p className="text-sm text-muted-foreground">Buyer approved the delivery. Your payout is being sent to your saved wallet address.</p>
        </ActionCard>
      ) : deal.status === 'Released' ? (
        <ActionCard title="✓ Deal complete — payout released!" icon={CheckCircle2} variant="success">
          <StepLabel step={6} total={6} label="Complete" />
          <p className="text-sm text-muted-foreground">Funds have been sent to your payout address. Thank you for using TrustVexa.</p>
        </ActionCard>
      ) : deal.status === 'Disputed' ? (
        <ActionCard title="Dispute opened" icon={AlertTriangle} variant="warning">
          <p className="text-sm text-muted-foreground">The middleman is reviewing the dispute. You can submit evidence and comments in the chat.</p>
        </ActionCard>
      ) : null}

      {/* Agree button for Invited/Created status when buyer joined */}
      {(deal.status === 'Created' || deal.status === 'Invited') && deal.buyerId && (
        sellerAlreadyAgreed ? (
          <ActionCard
            title={bothAgreed ? '✓ Both parties agreed — deal locked!' : '✓ You agreed — waiting for buyer to agree'}
            icon={CheckCircle2} variant="success">
            {bothAgreed ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Both parties agreed. Deal is locked. <strong>Save your payout wallet below</strong>, then the page will show your next step automatically.
                </p>
                <div className="rounded-xl border bg-background/60 p-3 space-y-2">
                  <p className="text-xs font-semibold">Your {deal.coin} payout address ({deal.network})</p>
                  <p className="text-xs text-muted-foreground">Where you want to receive payment when the deal is released.</p>
                  <div className="flex gap-2">
                    <Input value={payoutAddr} onChange={e => setPayoutAddr(e.target.value)} placeholder={`Your ${deal.network} address`} className="flex-1 font-mono text-xs" />
                    <Button size="sm" onClick={savePayout} disabled={paySubmitting || !payoutAddr.trim()}>{paySubmitting ? '…' : 'Save'}</Button>
                  </div>
                  {payMsg && <p className="text-xs text-emerald-600">✓ {payMsg}</p>}
                  {payErr && <p className="text-xs text-destructive">{payErr}</p>}
                </div>
                <p className="text-xs text-muted-foreground">Next step: you will be asked to share a verification code with the buyer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">✓ Your agreement is saved. Waiting for the buyer to also agree.</p>
                <p className="text-xs text-muted-foreground">You can safely refresh this page — your agreement is recorded in our system.</p>
              </div>
            )}
          </ActionCard>
        ) : (
          <ActionCard title="Agree to deal terms" icon={CheckCircle2}
            description="Review the deal summary below. Both parties must agree before funding can start.">
            {/* Deal terms */}
            {deal.terms && (
              <div className="rounded-lg bg-muted/40 border p-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deal terms</p>
                <p className="text-sm whitespace-pre-wrap">{deal.terms}</p>
              </div>
            )}
            {/* Key deal details */}
            <div className="rounded-lg bg-muted/30 border px-3 py-2 mb-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span className="font-medium">{deal.itemDescription ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Coin / Network</span><span className="font-medium">{deal.coin} · {deal.network}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deal amount</span><span className="font-semibold">{cents(deal.dealAmountCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">💰 You receive (est.)</span>
                <span className="font-semibold text-emerald-600">
                  {deal.sellerPayoutCents ? cents(deal.sellerPayoutCents) : (() => {
                    const d = Number(deal.dealAmountCents ?? 0);
                    const e = d >= 40000 ? estimateFees(d, (deal.feePayer ?? 'buyer') as FeePayer, 5000, estimateGasCents(deal.network)) : null;
                    return e ? `~${formatUsdCents(e.sellerReceivesCents)}` : '—';
                  })()}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee payer</span><span className="capitalize">{deal.feePayer ?? '—'}</span></div>
            </div>
            {agreeErr && <p className="text-xs text-destructive mb-2">⚠️ {agreeErr}</p>}
            <Button onClick={handleAgree} disabled={agreeing} className="w-full">
              {agreeing ? 'Recording agreement…' : 'I agree — lock the deal'}
            </Button>
          </ActionCard>
        )
      )}

      {/* Seller details form (post-lock) */}
      {isPostLock && !TERMINAL_STATES.has(deal.status) && (
        <SellerDetailsForm dealId={dealId} existing={partyDetails?.sellerDetails ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ['party-details', dealId] })} />
      )}

      {/* Middleman status */}
      {deal.middlemanId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
          <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">⚖️ Middleman assigned</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {deal.middlemanId.slice(0,8)}</p>
          </div>
        </div>
      ) : !TERMINAL_STATES.has(deal.status) && deal.status !== 'Disputed' && (
        <div className="rounded-xl border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Need a middleman?</p>
              <p className="text-xs text-muted-foreground">One click — they verify delivery and handle disputes.</p>
            </div>
            <Button size="sm" variant="outline" disabled={requestingMm} onClick={requestMm}>
              <Shield className="h-3.5 w-3.5 mr-1" />{requestingMm ? 'Connecting…' : 'Add middleman'}
            </Button>
          </div>
          {mmErr && (
            <div className="rounded-lg bg-muted/40 border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5">⚠️ {mmErr}</p>
              <p className="text-xs text-muted-foreground mb-2">You can still open a chat with the TrustVexa team for assistance:</p>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href="/connect"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Open support chat</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <ChatLink />
      <DealInfoCollapsible deal={deal} />
      <DealReviewForm dealId={dealId} status={deal.status} role={deal.role} />
    </div>
  );
}

// ─── BUYER VIEW ───────────────────────────────────────────────────────────────

interface BuyerViewProps {
  deal: DealDetail;
  dealId: string;
  partyDetails: PartyDetailsResult | undefined;
  qc: ReturnType<typeof useQueryClient>;
}

function BuyerView({ deal, dealId, partyDetails, qc }: BuyerViewProps) {
  const escrowQuery = useEscrowAddress(dealId, ['Agreed', 'Verified', 'Confirmed', 'Amended', 'Funded'].includes(deal.status));
  const escrow = escrowQuery.data;
  const [txHash, setTxHash] = React.useState('');
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payMsg, setPayMsg] = React.useState<string | null>(null);
  const [payErr, setPayErr] = React.useState<string | null>(null);
  const [agreeing, setAgreeing] = React.useState(false);
  const [agreeErr, setAgreeErr] = React.useState<string | null>(null);
  const [agreedResult, setAgreedResult] = React.useState<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean; status?: string } | null>(null);
  const [mmErr, setMmErr] = React.useState<string | null>(null);
  const [requestingMm, setRequestingMm] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [approveErr, setApproveErr] = React.useState<string | null>(null);
  const [disputing, setDisputing] = React.useState(false);
  const [disputeErr, setDisputeErr] = React.useState<string | null>(null);
  const [checkedItems, setCheckedItems] = React.useState({ coinNet: false, amount: false, risk: false });

  const isPostLock = POST_LOCK_STATES.has(deal.status);
  // Persistent agree state — survives page refresh via the API-returned fields
  const buyerAlreadyAgreed = !!(deal.buyerAgreedAt) || !!(agreedResult?.buyerAgreed);
  const dealLockedAt = !!(deal.lockedAt) || !!(agreedResult?.locked);

  const handleAgree = async () => {
    setAgreeing(true); setAgreeErr(null);
    try {
      const result = await apiRequest<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean; status: string }>(
        `/deals/${dealId}/agree`, { method: 'POST', idempotencyKey: newIdempotencyKey() }
      );
      setAgreedResult(result);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setAgreeErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to agree.'); }
    finally { setAgreeing(false); }
  };

  const submitTxHash = async () => {
    if (!txHash.trim()) return;
    setPaySubmitting(true); setPayErr(null);
    try {
      await apiRequest(`/deals/${dealId}/payment/submit-tx`, { method: 'POST', body: { txHash: txHash.trim() }, idempotencyKey: newIdempotencyKey() });
      setPayMsg('Payment submitted. Auto-detection usually takes a few minutes.'); setTxHash('');
      void qc.invalidateQueries({ queryKey: ['payment-status', dealId] });
    } catch (err) { setPayErr(err instanceof Error ? err.message : 'Failed to submit.'); }
    finally { setPaySubmitting(false); }
  };

  const handleApprove = async () => {
    if (!window.confirm('Confirm you received exactly what was agreed? This will release the payout to the seller.')) return;
    setApproving(true); setApproveErr(null);
    try {
      await apiRequest(`/deals/${dealId}/approve`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setApproveErr(err instanceof Error ? err.message : 'Failed to approve.'); }
    finally { setApproving(false); }
  };

  const openDispute = async () => {
    if (!window.confirm('Open a formal dispute? A middleman will review the case.')) return;
    setDisputing(true); setDisputeErr(null);
    try {
      await apiRequest(`/deals/${dealId}/dispute`, { method: 'POST', body: { category: 'delivery_dispute', statement: 'Buyer opened a dispute.' }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setDisputeErr(err instanceof Error ? err.message : 'Failed to open dispute.'); }
    finally { setDisputing(false); }
  };

  const requestMm = async () => {
    setRequestingMm(true); setMmErr(null);
    try {
      await apiRequest(`/deals/${dealId}/request-middleman`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'No middleman available.';
      setMmErr(msg.toLowerCase().includes('unexpected') ? 'No middleman available right now.' : msg);
    } finally { setRequestingMm(false); }
  };

  const mmName = deal.middlemanId ? 'Middleman assigned' : 'No middleman yet';

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">
            {deal.itemDescription ? `"${deal.itemDescription}"` : `Deal ${dealId.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Buyer</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Seller: {deal.sellerId ? deal.sellerId.slice(0,8) : 'TBD'} · {mmName}</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <DealStepper status={deal.status} />

      {/* Current action — BUYER */}
      {(deal.status === 'Created' || deal.status === 'Invited') && (
        buyerAlreadyAgreed ? (
          <ActionCard title={dealLockedAt ? '✓ Both parties agreed — deal locked!' : '✓ Your agreement recorded — waiting for seller'} icon={CheckCircle2} variant="success">
            {dealLockedAt ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Both parties agreed. The deal is now locked. You can fund the escrow below to start the deal.</p>
                <p className="text-xs text-muted-foreground">If the funding UI doesn&apos;t appear yet, refresh once.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your agreement is recorded. The page will update automatically once the seller also agrees.
              </p>
            )}
          </ActionCard>
        ) : (
          <ActionCard title="Review & agree to terms" icon={CheckCircle2}
            description="Both parties must agree before funding can begin.">
            {/* Deal terms */}
            {deal.terms && (
              <div className="rounded-lg bg-muted/40 border p-3 mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Deal terms</p>
                <p className="text-sm whitespace-pre-wrap">{deal.terms}</p>
              </div>
            )}
            {/* Fee summary */}
            <div className="rounded-lg bg-muted/30 border px-3 py-2 mb-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Item</span><span className="font-medium">{deal.itemDescription ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Coin / Network</span><span className="font-medium">{deal.coin} · {deal.network}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Deal amount</span><span className="font-semibold">{cents(deal.dealAmountCents)}</span></div>
              <div className="flex justify-between text-primary font-semibold"><span>💳 You will send</span>
                <span>
                  {deal.buyerTotalCents ? cents(deal.buyerTotalCents) : (() => {
                    const d = Number(deal.dealAmountCents ?? 0);
                    const e = d >= 40000 ? estimateFees(d, (deal.feePayer ?? 'buyer') as FeePayer, 5000, estimateGasCents(deal.network)) : null;
                    return e ? `~${formatUsdCents(e.buyerSendsCents)}` : '—';
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Includes platform fee</span><span className="text-muted-foreground">{cents(deal.platformFeeCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fee payer</span><span className="capitalize">{deal.feePayer ?? '—'}</span></div>
            </div>
            {/* Confirmations */}
            <div className="space-y-2 mb-3">
              {[
                { key: 'coinNet', label: `I confirm ${deal.coin} on ${deal.network} is correct.` },
                { key: 'amount', label: `I confirm the amount ${cents(deal.buyerTotalCents)} is correct.` },
                { key: 'risk', label: 'I understand crypto transactions are irreversible.' },
              ].map(item => (
                <label key={item.key} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0"
                    checked={checkedItems[item.key as keyof typeof checkedItems]}
                    onChange={e => setCheckedItems(prev => ({ ...prev, [item.key]: e.target.checked }))} />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
            {agreeErr && <p className="text-xs text-destructive mb-2">⚠️ {agreeErr}</p>}
            <Button onClick={handleAgree} disabled={agreeing || !Object.values(checkedItems).every(Boolean)} className="w-full">
              {agreeing ? 'Recording agreement…' : 'I agree — confirm deal terms'}
            </Button>
          </ActionCard>
        )
      )}

      {/* Show escrow funding at Agreed/Verified/Confirmed/Amended — buyer can fund immediately after both agree */}
      {(deal.status === 'Agreed' || deal.status === 'Verified' || deal.status === 'Confirmed' || deal.status === 'Amended') && (
        <ActionCard title="Fund the escrow — send exactly this amount" icon={Wallet}
          description={`Send exact ${deal.coin} amount. Wrong amount or wrong network = permanent loss.`}>
          <StepLabel step={3} total={6} label="Buyer funds the escrow" />
          <NoRollbackBanner text="Once you send crypto to the escrow address it cannot be recalled. Only proceed after verifying all deal details." />
          {/* Exact amount box — prominent */}
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 px-4 py-3 mb-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Send exactly</p>
            <p className="font-display text-2xl font-bold text-primary">
              {deal.amountCoin ? `${deal.amountCoin} ${deal.coin}` : (() => {
                const d = Number(deal.dealAmountCents ?? 0);
                const e = d >= 40000 ? estimateFees(d, (deal.feePayer ?? 'buyer') as FeePayer, 5000, estimateGasCents(deal.network)) : null;
                return e ? `~${formatUsdCents(e.buyerSendsCents)} USD worth of ${deal.coin}` : `${deal.coin} amount TBD`;
              })()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">on <strong>{deal.network}</strong> network</p>
          </div>
          {escrow ? (
            <div className="space-y-4">
              <WalletInput address={escrow.address} coin={escrow.coin} network={escrow.network} explorerUrl={escrow.explorerAddressUrl || undefined} {...(deal.amountCoin ? { amountText: `${deal.amountCoin} ${deal.coin}` } : {})} />
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ {escrow.networkWarning}</div>
              <PaymentInstructions coin={escrow.coin} network={escrow.network} />
              <ConfirmationCounter dealId={dealId} requiredConfirmations={getRequiredConfirmations(escrow.network)} />
              <div className="space-y-1.5">
                <Label htmlFor="txhash">Already sent? Paste your transaction hash</Label>
                <div className="flex gap-2">
                  <Input id="txhash" value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x… or TX ID" className="flex-1 font-mono text-xs" />
                  <Button onClick={submitTxHash} disabled={paySubmitting || !txHash.trim()}>{paySubmitting ? '…' : 'Submit'}</Button>
                </div>
                {payMsg && <p className="text-xs text-emerald-600">{payMsg}</p>}
                {payErr && <p className="text-xs text-destructive">{payErr}</p>}
              </div>
            </div>
          ) : <Skeleton className="h-32 w-full rounded-xl" />}
          <NextStep text="Seller delivers the item → submits handover to middleman → middleman verifies → you inspect and approve → deal complete." />
        </ActionCard>
      )}

      {deal.status === 'Funded' && (
        <ActionCard title="Escrow funded — waiting for seller to deliver" icon={Clock} variant="success">
          <StepLabel step={4} total={6} label="Seller is preparing delivery" />
          <p className="text-sm text-muted-foreground">Your funds are safely locked in escrow. The seller will deliver the item and notify the middleman.</p>
          <NextStep text="Seller delivers → submits handover → middleman verifies → you'll be asked to inspect and approve." />
        </ActionCard>
      )}

      {(deal.status === 'SellerHandover' || deal.status === 'MiddlemanVerified') && (
        <ActionCard title="Middleman is verifying the delivery" icon={Shield} variant="success">
          <StepLabel step={5} total={6} label="Middleman verification in progress" />
          <p className="text-sm text-muted-foreground">The middleman is reviewing the seller's handover. You'll be notified once confirmed.</p>
          <NextStep text="Once verified → you'll enter the inspection window and can approve or open a dispute." />
        </ActionCard>
      )}

      {deal.status === 'Delivered' && (
        <ActionCard title="Delivery confirmed — inspect & approve" icon={CheckCircle2} variant="warning">
          <StepLabel step={6} total={6} label="Your inspection window" />
          <p className="text-sm text-muted-foreground mb-3">The middleman confirmed delivery. Inspect carefully — verify you received exactly what was agreed.</p>
          <NoRollbackBanner text="Once you click 'Approve', the seller receives payment INSTANTLY. This cannot be reversed. Only approve if you are fully satisfied." />
          <div className="mt-3 space-y-2">
            {approveErr && <p className="text-xs text-destructive">{approveErr}</p>}
            {disputeErr && <p className="text-xs text-destructive">{disputeErr}</p>}
            <Button onClick={handleApprove} disabled={approving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />{approving ? 'Approving…' : 'Approve & release payment to seller'}
            </Button>
            <Button onClick={openDispute} disabled={disputing} variant="outline" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10">
              {disputing ? '…' : '⚠️ Item not as described — open dispute'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">Open a dispute if the item is not as described. A middleman will review your case.</p>
          </div>
        </ActionCard>
      )}

      {(deal.status === 'Approved' || deal.status === 'PayoutQueued') && (
        <ActionCard title="Payment processing — almost done!" icon={Clock} variant="success">
          <StepLabel step={6} total={6} label="Payout in progress" />
          <p className="text-sm text-muted-foreground">You approved the delivery. The seller&apos;s payment is being processed.</p>
        </ActionCard>
      )}

      {deal.status === 'Released' && (
        <ActionCard title="✓ Deal complete" icon={CheckCircle2} variant="success">
          <StepLabel step={6} total={6} label="Complete" />
          <p className="text-sm text-muted-foreground">The deal is fully settled. Thank you for using TrustVexa.</p>
        </ActionCard>
      )}

      {deal.status === 'Disputed' && (
        <ActionCard title="Dispute open" icon={AlertTriangle} variant="warning">
          <p className="text-sm text-muted-foreground">The middleman is reviewing your case. Please use the chat to provide evidence.</p>
        </ActionCard>
      )}

      {/* Buyer details form (post-lock) */}
      {isPostLock && !TERMINAL_STATES.has(deal.status) && (
        <BuyerDetailsForm dealId={dealId} existing={partyDetails?.buyerDetails ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ['party-details', dealId] })} />
      )}

      {/* Middleman status */}
      {deal.middlemanId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
          <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">⚖️ Middleman assigned</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {deal.middlemanId.slice(0,8)}</p>
          </div>
        </div>
      ) : !TERMINAL_STATES.has(deal.status) && deal.status !== 'Disputed' && (
        <div className="rounded-xl border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Need a middleman?</p>
              <p className="text-xs text-muted-foreground">They verify delivery and handle any disputes.</p>
            </div>
            <Button size="sm" variant="outline" disabled={requestingMm} onClick={requestMm}>
              <Shield className="h-3.5 w-3.5 mr-1" />{requestingMm ? '…' : 'Add middleman'}
            </Button>
          </div>
          {mmErr && (
            <div className="rounded-lg bg-muted/40 border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1.5">⚠️ {mmErr}</p>
              <p className="text-xs text-muted-foreground mb-2">Contact support for assistance:</p>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link href="/connect"><MessageCircle className="h-3.5 w-3.5 mr-1" /> Open support chat</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <ChatLink />
      <DealInfoCollapsible deal={deal} />
      <DealReviewForm dealId={dealId} status={deal.status} role={deal.role} />
    </div>
  );
}

// ─── MIDDLEMAN VIEW ───────────────────────────────────────────────────────────

interface MiddlemanViewProps {
  deal: DealDetail;
  dealId: string;
  partyDetails: PartyDetailsResult | undefined;
  qc: ReturnType<typeof useQueryClient>;
}

function MiddlemanView({ deal, dealId, partyDetails, qc }: MiddlemanViewProps) {
  const disputeQuery = useDealDispute(dealId, deal.status === 'Disputed');
  const [verifying, setVerifying] = React.useState(false);
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null);
  const [delivering, setDelivering] = React.useState(false);
  const [deliverErr, setDeliverErr] = React.useState<string | null>(null);
  const [verifyingParty, setVerifyingParty] = React.useState<'seller' | 'buyer' | null>(null);

  const verifyHandover = async () => {
    setVerifying(true); setVerifyErr(null);
    try {
      await apiRequest(`/deals/${dealId}/handover/verify`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setVerifyErr(err instanceof Error ? err.message : 'Failed to verify.'); }
    finally { setVerifying(false); }
  };

  const deliverToBuyer = async () => {
    setDelivering(true); setDeliverErr(null);
    try {
      await apiRequest(`/deals/${dealId}/deliver`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setDeliverErr(err instanceof Error ? err.message : 'Failed to deliver.'); }
    finally { setDelivering(false); }
  };

  const verifyPartyDetails = async (role: 'seller' | 'buyer') => {
    setVerifyingParty(role);
    try {
      await apiRequest(`/deals/${dealId}/party-details/verify`, { method: 'POST', body: { role }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['party-details', dealId] });
    } catch { /* ignore */ }
    finally { setVerifyingParty(null); }
  };

  const seller = partyDetails?.sellerDetails;
  const buyer = partyDetails?.buyerDetails;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold truncate">
            {deal.itemDescription ? `"${deal.itemDescription}"` : `Deal ${dealId.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">⚖️ Middleman</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>Buyer: {deal.buyerId ? deal.buyerId.slice(0,8) : '—'}</span>
            <span>Seller: {deal.sellerId ? deal.sellerId.slice(0,8) : '—'}</span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <DealStepper status={deal.status} />

      {/* Middleman action */}
      {deal.status === 'SellerHandover' && (
        <ActionCard title="Verify seller handover" icon={Shield} description="Confirm that the seller has completed the handover as agreed. This advances the deal to the delivery stage." variant="warning">
          {verifyErr && <p className="text-xs text-destructive mb-2">{verifyErr}</p>}
          <Button onClick={verifyHandover} disabled={verifying} className="w-full">{verifying ? 'Verifying…' : 'Confirm — seller handover verified ✓'}</Button>
        </ActionCard>
      )}

      {deal.status === 'MiddlemanVerified' && (
        <ActionCard title="Confirm delivery to buyer" icon={CheckCircle2} description="After confirming, the deal moves to Delivered and the buyer's inspection window starts." variant="warning">
          {deliverErr && <p className="text-xs text-destructive mb-2">{deliverErr}</p>}
          <Button onClick={deliverToBuyer} disabled={delivering} className="w-full">{delivering ? 'Confirming…' : 'Confirm delivery to buyer ✓'}</Button>
        </ActionCard>
      )}

      {deal.status === 'Disputed' && disputeQuery.data && (
        <ActionCard title="Resolve this dispute" icon={AlertTriangle} variant="warning">
          <DisputeResolveForm dealId={dealId} />
        </ActionCard>
      )}

      {deal.status === 'PayoutQueued' && (
        <ActionCard title="Release payout" icon={Wallet} variant="warning">
          <MilestoneReleasePanel dealId={dealId} />
        </ActionCard>
      )}

      {/* Two-column: Seller details | Buyer details */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Seller's submission */}
        <Card className={seller?.verifiedByMiddleman ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/30'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Seller's Details</span>
              </span>
              {seller?.verifiedByMiddleman
                ? <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Verified</span>
                : seller && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={verifyingParty === 'seller'} onClick={() => verifyPartyDetails('seller')}>{verifyingParty === 'seller' ? '…' : 'Verify seller ✓'}</Button>
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {!seller ? (
              <p className="text-muted-foreground italic">Seller hasn't submitted details yet.</p>
            ) : (
              <>
                {seller.productName && <div><span className="font-medium">Product: </span>{seller.productName}</div>}
                {seller.deliveryMethod && <div><span className="font-medium">Method: </span>{seller.deliveryMethod}</div>}
                {seller.estimatedDeliveryTime && <div><span className="font-medium">ETA: </span>{seller.estimatedDeliveryTime}</div>}
                {seller.productDescription && <div className="mt-2"><span className="font-medium block mb-0.5">Description:</span><p className="text-muted-foreground whitespace-pre-wrap">{seller.productDescription}</p></div>}
                {(seller.requirementsForBuyer ?? seller.requirements) && <div><span className="font-medium block mb-0.5">Requirements from buyer:</span><p className="text-muted-foreground whitespace-pre-wrap">{seller.requirementsForBuyer ?? seller.requirements}</p></div>}
                {seller.deliveryInstructions && <div><span className="font-medium block mb-0.5">Delivery instructions:</span><p className="text-muted-foreground whitespace-pre-wrap">{seller.deliveryInstructions}</p></div>}
                {seller.additionalNotes && <div><span className="font-medium block mb-0.5">Notes:</span><p className="text-muted-foreground whitespace-pre-wrap">{seller.additionalNotes}</p></div>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Buyer's submission */}
        <Card className={buyer?.confirmedByBuyer ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-blue-500/30'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              <span className="text-[9px] font-bold uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.5 rounded-full">Buyer's Details</span>
              {buyer?.confirmedByBuyer
                ? <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>
                : buyer && <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={verifyingParty === 'buyer'} onClick={() => verifyPartyDetails('buyer')}>{verifyingParty === 'buyer' ? '…' : 'Confirm buyer ✓'}</Button>
              }
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {!buyer ? (
              <p className="text-muted-foreground italic">Buyer hasn't submitted details yet.</p>
            ) : (
              <>
                {buyer.receivingPlatform && <div><span className="font-medium">Platform: </span>{buyer.receivingPlatform}</div>}
                {buyer.receivingAddress && (
                  <div className="flex items-start gap-1">
                    <span className="font-medium shrink-0">Address: </span>
                    <span className="break-all">{buyer.receivingAddress}</span>
                    <CopyButton text={buyer.receivingAddress} />
                  </div>
                )}
                {buyer.contactEmail && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Email: </span>{buyer.contactEmail}
                    <CopyButton text={buyer.contactEmail} />
                  </div>
                )}
                {buyer.backupContact && <div><span className="font-medium">Backup: </span>{buyer.backupContact}</div>}
                {buyer.specialInstructions && <div className="mt-1"><span className="font-medium block mb-0.5">Instructions:</span><p className="text-muted-foreground whitespace-pre-wrap">{buyer.specialInstructions}</p></div>}
                {(buyer.suggestions ?? buyer.notes) && <div><span className="font-medium block mb-0.5">Notes:</span><p className="text-muted-foreground whitespace-pre-wrap">{buyer.suggestions ?? buyer.notes}</p></div>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ChatLink />
      <DealInfoCollapsible deal={deal} />

      {SETTLED_STATES.has(deal.status) && (
        <DealReviewForm dealId={dealId} status={deal.status} role={deal.role} />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const dealId = params.id;
  const router = useRouter();
  const { status } = useAuth();
  const qc = useQueryClient();
  const { socket } = useDealRoom(dealId);

  React.useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=/deals/${dealId}`);
  }, [status, router, dealId]);

  React.useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
      void qc.invalidateQueries({ queryKey: ['escrow-address', dealId] });
      void qc.invalidateQueries({ queryKey: ['payment-status', dealId] });
    };
    socket.on('deal:update', refresh);
    socket.on('deal:state_changed', refresh);
    socket.on('confirmation:tick', () => qc.invalidateQueries({ queryKey: ['escrow-address', dealId] }));
    return () => { socket.off('deal:update', refresh); socket.off('deal:state_changed', refresh); };
  }, [socket, dealId, qc]);

  const dealQuery = useDealDetail(dealId, status === 'authenticated');
  const partyDetailsQuery = usePartyDetails(dealId, status === 'authenticated' && !!dealQuery.data && POST_LOCK_STATES.has(dealQuery.data?.status ?? ''));

  const deal = dealQuery.data;

  if (status !== 'authenticated' || dealQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (dealQuery.isError || !deal) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>Could not load deal. It may have been removed or you don't have access.</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4"><Link href="/deals"><ArrowLeft className="h-4 w-4 mr-1" /> Back to deals</Link></Button>
      </div>
    );
  }

  const props = { deal, dealId, partyDetails: partyDetailsQuery.data, qc };

  if (deal.role === 'middleman') return <MiddlemanView {...props} />;
  if (deal.role === 'seller') return <SellerView {...props} />;
  return <BuyerView {...props} />;
}
