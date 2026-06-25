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
  ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  Copy, Check, FileText, MessageCircle, Shield,
  Wallet, UserPlus, Send, X,
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
  formatBps,
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

// Seller product details form shows at the "Funded" stepper stage = statuses
// Agreed→Confirmed (data entry). At "In Progress" (status Funded) it's review
// only; the form only reappears there as a fallback if it was never filled.
const DETAIL_FORM_STATES = new Set(['Agreed', 'Verified', 'Confirmed', 'Amended']);

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

interface PaymentStatusView {
  dealId: string;
  events: { id: string; statusStep: string | null; message: string | null; createdAt: string | null }[];
  payoutAddress: string | null;
  submittedTxHash: string | null;
}

function usePaymentStatus(dealId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['payment-status', dealId], enabled,
    queryFn: async () => {
      try { return await apiRequest<PaymentStatusView>(`/deals/${dealId}/payment/status`); }
      catch { return null; }
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


// ─── Deal Status Stepper ──────────────────────────────────────────────────────

function getRequiredConfirmations(network: string): number {
  const n = network.toUpperCase();
  if (n.includes('ETH')) return 12;
  if (n.includes('BNB')) return 15;
  if (n.includes('TRON') || n.includes('TRX')) return 20;
  if (n.includes('SOLANA') || n.includes('SOL')) return 1;
  return 12;
}

const STAGES = ['Created', 'Agreed', 'Funded', 'In Progress', 'Delivered', 'Complete'] as const;

function statusToStage(status: string, role?: string): number {
  // User model: 1 Created · 2 Agreed · 3 Funded · 4 In Progress · 5 Delivered · 6 Complete
  // Per-side: the buyer's and seller's progress are independent so one side's
  // action never advances the other side's stepper. The only divergence is the
  // 'Funded' status: the buyer paying makes the BUYER "In Progress" (4) while
  // the SELLER stays at "Funded" (3) until they start their own delivery.
  if (['Released', 'PartiallySettled'].includes(status)) return 6;
  if (['Delivered', 'Approved', 'PayoutQueued', 'MilestoneReleased'].includes(status)) return 5;
  if (['SellerHandover', 'MiddlemanVerified'].includes(status)) return 4; // In Progress (seller delivering)
  if (status === 'Funded') return role === 'seller' ? 3 : 4;
  if (['Confirmed', 'Amended'].includes(status)) return 3; // Funded — fund + enter details
  if (['Agreed', 'Verified'].includes(status)) return 2; // Agreed
  if (['Created', 'Invited'].includes(status)) return 1;
  return 0;
}

function DealStepper({ status, agreedInProgress, role }: { status: string; agreedInProgress?: boolean; role?: string }) {
  const isDisputed = status === 'Disputed';
  const isClosed = ['Cancelled', 'Expired', 'Refunded'].includes(status);
  let current = statusToStage(status, role);
  // When the deal is still Created/Invited but at least one party has agreed,
  // surface the "Agreed" stage (2) so the stepper reflects real progress.
  if (agreedInProgress && current === 1) current = 2;

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

// ─── Per-side progress track ──────────────────────────────────────────────────
// Each party (buyer, seller) gets their OWN independent checklist driven only by
// THAT side's completed actions — one side acting never moves the other side's
// track. Every item is derived from data stored in the database for that side.

const STATUS_ORDER = [
  'Created', 'Invited', 'Agreed', 'Verified', 'Confirmed', 'Amended',
  'Funded', 'SellerHandover', 'MiddlemanVerified', 'Delivered',
  'Approved', 'PayoutQueued', 'MilestoneReleased', 'Released',
] as const;

/** True when `status` has reached `target` or beyond in the escrow order. */
function reached(status: string, target: string): boolean {
  const s = STATUS_ORDER.indexOf(status as typeof STATUS_ORDER[number]);
  const t = STATUS_ORDER.indexOf(target as typeof STATUS_ORDER[number]);
  return s >= 0 && t >= 0 && s >= t;
}

export interface TrackItem { label: string; done: boolean; hint?: string }

function SideTrack({ title, subtitle, accent, items }: {
  title: string;
  subtitle: string;
  accent: 'blue' | 'emerald';
  items: TrackItem[];
}) {
  const currentIdx = items.findIndex((i) => !i.done);
  const ring = accent === 'blue' ? 'ring-blue-500/30 border-blue-500/30' : 'ring-emerald-500/30 border-emerald-500/30';
  const dot = accent === 'blue' ? 'bg-blue-600' : 'bg-emerald-600';
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div className={`rounded-2xl border-2 ${ring} bg-card p-4`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">{doneCount}/{items.length} done</span>
      </div>
      <ol className="space-y-2.5">
        {items.map((it, i) => {
          const isCurrent = !it.done && i === currentIdx;
          return (
            <li key={it.label} className="flex items-start gap-2.5">
              <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                it.done ? `${dot} text-white` : isCurrent ? `${dot} text-white ring-4 ring-current/15` : 'bg-muted text-muted-foreground border'
              }`}>
                {it.done ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm ${it.done ? 'text-muted-foreground line-through' : isCurrent ? 'font-semibold' : 'text-muted-foreground'}`}>{it.label}</p>
                {isCurrent && it.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{it.hint}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}



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
  const splitBuyerBps = deal.feeSplitBuyerBps ?? 5000;
  const estimate = dealCents >= 40000 ? estimateFees(dealCents, feePayerKey, splitBuyerBps, gasCents) : null;
  const role = deal.role; // 'buyer' | 'seller' | 'middleman'
  const myPlatformShareCents = estimate
    ? role === 'buyer' ? estimate.buyerPlatformShareCents
      : role === 'seller' ? estimate.sellerPlatformShareCents
      : null
    : null;

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

        {/* Platform fee split — who pays what, and YOUR share */}
        {estimate && (
          <div className="rounded-lg bg-muted/30 border px-3 py-2.5 space-y-1.5">
            {feePayerKey === 'split' ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground">
                  Platform fee is split — total {isEstimate ? '~' : ''}{formatUsdCents(estimate.platformFeeCents)}
                </p>
                <div className="grid grid-cols-2 gap-x-6 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-blue-600 dark:text-blue-400">Buyer pays ({formatBps(splitBuyerBps)})</span>
                    <span className="font-medium">{isEstimate ? '~' : ''}{formatUsdCents(estimate.buyerPlatformShareCents)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-emerald-600">Seller pays ({formatBps(10000 - splitBuyerBps)})</span>
                    <span className="font-medium">{isEstimate ? '~' : ''}{formatUsdCents(estimate.sellerPlatformShareCents)}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold capitalize text-foreground">{feePayerKey}</span> pays the full platform fee of {isEstimate ? '~' : ''}{formatUsdCents(estimate.platformFeeCents)}.
              </p>
            )}
            {(role === 'buyer' || role === 'seller') && myPlatformShareCents !== null && (
              <p className="text-sm pt-0.5 border-t border-border/40">
                <span className="text-muted-foreground">Your share of the platform fee </span>
                <span className="text-[10px] uppercase font-bold align-middle px-1.5 py-0.5 rounded bg-primary/10 text-primary">{role}</span>
                <span className="font-bold ml-1">{isEstimate ? '~' : ''}{formatUsdCents(myPlatformShareCents)}</span>
                {role === 'seller' && (
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    Plus a 0.5% settlement fee ({isEstimate ? '~' : ''}{formatUsdCents(estimate.settlementFeeCents)}) and network gas, taken from your payout.
                  </span>
                )}
              </p>
            )}
          </div>
        )}
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
          {deal.connectionCode && (
            <Row label="Deal chat" value={
              <Link href={`/connect?open=${deal.connectionId ?? ''}`} className="font-mono text-xs text-primary hover:underline">
                {deal.connectionCode} →
              </Link>
            } />
          )}
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

/** Map a deal role to the middleman chat channel that role participates in. */
function mmChatType(role: string): 'buyer_mm' | 'seller_mm' | undefined {
  if (role === 'buyer') return 'buyer_mm';
  if (role === 'seller') return 'seller_mm';
  return undefined;
}

/** Build a deep link into the connection (chat) tied to THIS deal, optionally
 * opening a specific channel tab. Falls back to the connect inbox if the deal
 * has no linked connection. */
function dealChatHref(connectionId: string | null | undefined, channel?: string): string {
  if (!connectionId) return '/connect';
  const params = new URLSearchParams({ open: connectionId });
  if (channel) params.set('channel', channel);
  return `/connect?${params.toString()}`;
}

function ChatLink({ connectionId }: { connectionId: string | null }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium">Chat</span>
        <span className="text-xs text-muted-foreground">with your counterparty and middleman</span>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={dealChatHref(connectionId)}><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Open chat</Link>
      </Button>
    </div>
  );
}

// ─── Seller Details Form ──────────────────────────────────────────────────────
// Seller fills: product name · email for payment confirmation · middleman instructions
// Only visible to the seller and middleman (NOT the buyer).

function SellerDetailsForm({ dealId, existing, onSaved }: {
  dealId: string; existing: SellerDetailsData | null; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [productName, setProductName] = React.useState(existing?.productName ?? '');
  const [email, setEmail] = React.useState(existing?.additionalNotes ?? '');
  const [mmInstructions, setMmInstructions] = React.useState(existing?.deliveryInstructions ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Re-populate when saved data loads from the server (async query resolves after mount)
  React.useEffect(() => {
    if (existing) {
      setProductName(existing.productName ?? '');
      setEmail(existing.additionalNotes ?? '');
      setMmInstructions(existing.deliveryInstructions ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.productName, existing?.additionalNotes]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await apiRequest(`/deals/${dealId}/seller-details`, { method: 'POST', idempotencyKey: newIdempotencyKey(),
        body: { productName, additionalNotes: email, deliveryInstructions: mmInstructions,
          deliveryMethod: 'Email', productDescription: null, requirements: null, estimatedDeliveryTime: null } });
      setSuccess(true);
      void qc.invalidateQueries({ queryKey: ['party-details', dealId] });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const isSaved = !!(existing?.productName || existing?.additionalNotes || existing?.deliveryInstructions);

  return (
    <ActionCard title="Your product & delivery details" description="Only visible to the middleman — not to the buyer." icon={Send}>
      {isSaved && <p className="text-xs text-emerald-600 mb-3 font-medium">✓ Saved. Edit below to update.</p>}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="sd-name">Selling account details</Label>
          <Input id="sd-name" value={productName} onChange={e => setProductName(e.target.value)}
            placeholder="What you are selling / account to be transferred" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sd-email">Your email <span className="text-muted-foreground text-xs">(for payment confirmation)</span></Label>
          <Input id="sd-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Payment confirmation will be sent here" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sd-mm">Instructions for middleman</Label>
          <textarea id="sd-mm" rows={3} value={mmInstructions} onChange={e => setMmInstructions(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Verify buyer's account before confirming, delivery method details, any special conditions…" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-600">✓ Details saved.</p>}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : isSaved ? 'Update details' : 'Save my details'}
        </Button>
      </div>
    </ActionCard>
  );
}

// ─── Buyer Details Form ───────────────────────────────────────────────────────
// Buyer fills: receiving account · email for confirmation · middleman instructions
// Only visible to the buyer and middleman (NOT the seller).

function BuyerDetailsForm({ dealId, existing, onSaved }: {
  dealId: string; existing: BuyerDetailsData | null; onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [account, setAccount] = React.useState(existing?.receivingAddress ?? '');
  const [email, setEmail] = React.useState(existing?.contactEmail ?? '');
  const [mmInstructions, setMmInstructions] = React.useState(existing?.specialInstructions ?? '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Re-populate when saved data loads from the server (async query resolves after mount)
  React.useEffect(() => {
    if (existing) {
      setAccount(existing.receivingAddress ?? '');
      setEmail(existing.contactEmail ?? '');
      setMmInstructions(existing.specialInstructions ?? '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.receivingAddress, existing?.contactEmail]);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false);
    try {
      await apiRequest(`/deals/${dealId}/buyer-details`, { method: 'POST', idempotencyKey: newIdempotencyKey(),
        body: { receivingAddress: account, contactEmail: email, specialInstructions: mmInstructions,
          receivingPlatform: 'Email', backupContact: null, suggestions: null } });
      setSuccess(true);
      void qc.invalidateQueries({ queryKey: ['party-details', dealId] });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const isSaved = !!(existing?.receivingAddress || existing?.contactEmail || existing?.specialInstructions);

  return (
    <ActionCard title="Your receiving details" description="Tell the middleman where to deliver. The seller cannot see this." icon={Wallet}>
      {isSaved && <p className="text-xs text-emerald-600 mb-3 font-medium">✓ Saved. Edit below to update.</p>}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="bd-account">Receiving account / address</Label>
          <Input id="bd-account" value={account} onChange={e => setAccount(e.target.value)}
            placeholder="Email, wallet, username or account where product will be delivered" />
          <p className="text-xs text-muted-foreground">Where the seller should send the product or service</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bd-email">Your email <span className="text-muted-foreground text-xs">(for delivery confirmation)</span></Label>
          <Input id="bd-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Delivery confirmation will be sent here" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bd-mm">Instructions for middleman</Label>
          <textarea id="bd-mm" rows={3} value={mmInstructions} onChange={e => setMmInstructions(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. Verify that the account is active and matches what was agreed before approving delivery…" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-600">✓ Details saved.</p>}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : isSaved ? 'Update details' : 'Save my details'}
        </Button>
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

// ─── Deal Review Summary ───────────────────────────────────────────────────
// Read-only consolidated review of everything entered across the deal: amounts,
// fees, the buyer's receiving details and the seller's product/delivery details.
// Shown at the Funded / In Progress / Delivered stages so each party can review
// before/after the handover. Each party sees their own details; the middleman
// sees both (the party-details API already enforces this visibility).

function DealReviewSummary({ deal, partyDetails }: { deal: DealDetail; partyDetails: PartyDetailsResult | undefined }) {
  const seller = partyDetails?.sellerDetails;
  const buyer = partyDetails?.buyerDetails;
  return (
    <div className="rounded-xl border bg-muted/10 px-4 py-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deal review — all details</p>

      {/* Money summary */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Item</span><span className="font-medium truncate">{deal.itemDescription ?? '—'}</span></div>
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Coin / Network</span><span className="font-medium">{deal.coin} · {deal.network}</span></div>
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Deal amount</span><span className="font-semibold">{cents(deal.dealAmountCents)}</span></div>
        <div className="flex justify-between gap-2"><span className="text-muted-foreground">Fee payer</span><span className="capitalize">{deal.feePayer ?? '—'}</span></div>
        <div className="flex justify-between gap-2"><span className="text-blue-600 dark:text-blue-400">Buyer sends</span><span className="font-semibold text-blue-600 dark:text-blue-400">{cents(deal.buyerTotalCents)}</span></div>
        <div className="flex justify-between gap-2"><span className="text-emerald-600">Seller receives</span><span className="font-semibold text-emerald-600">{cents(deal.sellerPayoutCents)}</span></div>
      </div>

      {/* Seller's product & delivery details */}
      {seller && (
        <div className="rounded-lg border bg-background/50 px-3 py-2 space-y-0.5 text-xs">
          <p className="font-semibold text-emerald-600 mb-1">Seller — product &amp; delivery</p>
          {seller.productName && <div><span className="text-muted-foreground">Selling: </span>{seller.productName}</div>}
          {seller.additionalNotes && <div><span className="text-muted-foreground">Seller email: </span>{seller.additionalNotes}</div>}
          {seller.deliveryInstructions && <div><span className="text-muted-foreground">Middleman instructions: </span>{seller.deliveryInstructions}</div>}
        </div>
      )}

      {/* Buyer's receiving details */}
      {buyer && (
        <div className="rounded-lg border bg-background/50 px-3 py-2 space-y-0.5 text-xs">
          <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1">Buyer — receiving details</p>
          {buyer.receivingAddress && <div><span className="text-muted-foreground">Receiving account: </span>{buyer.receivingAddress}</div>}
          {buyer.contactEmail && <div><span className="text-muted-foreground">Buyer email: </span>{buyer.contactEmail}</div>}
          {buyer.specialInstructions && <div><span className="text-muted-foreground">Middleman instructions: </span>{buyer.specialInstructions}</div>}
        </div>
      )}
    </div>
  );
}

// ─── Deal Progress CTA ─────────────────────────────────────────────────────
// Shown after a step completes — gives user a clear "what to do next" action.

function DealProgressCTA({ step, nextLabel, note }: {
  step: string; nextLabel: string; note?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-primary">✓ {step}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{nextLabel}</p>
        {note && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{note}</p>}
      </div>
      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
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
  const router = useRouter();
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

  // Read back the saved payout wallet so it persists across refreshes.
  const paymentStatusQ = usePaymentStatus(dealId, true);
  React.useEffect(() => {
    if (paymentStatusQ.data?.payoutAddress) {
      setPayoutAddr(paymentStatusQ.data.payoutAddress);
    }
  }, [paymentStatusQ.data?.payoutAddress]);
  const payoutAlreadySaved = !!paymentStatusQ.data?.payoutAddress;
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
      void qc.invalidateQueries({ queryKey: ['payment-status', dealId] });
    } catch (err) { setPayErr(err instanceof Error ? err.message : 'Failed to save wallet.'); }
    finally { setPaySubmitting(false); }
  };

  // FREE REFUND — seller voluntarily refunds the buyer (no gas deducted)
  const [refunding, setRefunding] = React.useState(false);
  const [refundErr, setRefundErr] = React.useState<string | null>(null);
  const [refundOk, setRefundOk] = React.useState(false);
  // Advance a no-middleman deal from SellerHandover → Delivered.
  const [advancing, setAdvancing] = React.useState(false);
  const [advanceErr, setAdvanceErr] = React.useState<string | null>(null);

  const advanceDelivery = async () => {
    setAdvancing(true); setAdvanceErr(null);
    try {
      await apiRequest(`/deals/${dealId}/advance-delivery`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setAdvanceErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to advance.'); }
    finally { setAdvancing(false); }
  };

  const submitHandover = async () => {
    if (!window.confirm('Confirm the buyer has received everything as agreed? This marks the deal Delivered and cannot be undone.')) return;
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
        body: { reason: 'Seller initiated voluntary refund' },
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
      void qc.invalidateQueries({ queryKey: ['chats'] });
      void qc.invalidateQueries({ queryKey: ['connections'] });
      // Take the user straight into THIS deal's chat with the middleman that
      // was just assigned (buyer→buyer_mm, seller→seller_mm).
      router.push(dealChatHref(deal.connectionId, mmChatType(deal.role)));
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
  // Seller must save product details before submitting the handover.
  const sellerDetailsSaved = !!(partyDetails?.sellerDetails?.productName);
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
          {deal.connectionCode && (
            <Link href={`/connect?open=${deal.connectionId ?? ''}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5">
              <MessageCircle className="h-3 w-3" /> Deal chat: <span className="font-mono font-semibold">{deal.connectionCode}</span>
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">Seller</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">Deal ID: {dealId.slice(0, 8).toUpperCase()}</span> · {counterparty} · {mmName}
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <SideTrack
        title="📦 Your seller track"
        subtitle="Your own steps — independent of the buyer"
        accent="emerald"
        items={[
          { label: 'Agree & lock the deal', done: !!deal.sellerAgreedAt || reached(deal.status, 'Confirmed'), hint: 'Confirm the terms to lock the deal.' },
          { label: 'Save your payout address', done: payoutAlreadySaved, hint: 'The wallet where you receive your payout.' },
          { label: 'Add product / account details', done: sellerDetailsSaved, hint: 'What you are selling + delivery info (required).' },
          { label: 'Mark delivered to the buyer', done: reached(deal.status, 'Delivered'), hint: 'Once the buyer has funded and you have delivered.' },
          { label: 'Payout released to you', done: reached(deal.status, 'Released') || deal.status === 'PartiallySettled' },
        ]}
      />

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
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2 flex items-start gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Once the buyer accepts, a chat tied to this deal is created automatically — you&apos;ll
                  be able to message them (and the middleman, once added) right from the deal.
                </p>
              </div>
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
          || deal.status === 'Confirmed' || deal.status === 'Amended'
          || ((deal.status === 'Created' || deal.status === 'Invited') && bothAgreed) ? (
        <ActionCard title="Deal locked — save your payout address" icon={Wallet} variant="success">
          <StepLabel step={3} total={6} label="Funded — enter details &amp; receive payment" />
          <p className="text-sm text-muted-foreground mb-3">Both parties agreed. Save where you want to receive payment. The buyer will now fund the escrow.</p>
          <div className="space-y-2">
            <Label htmlFor="payoutAddr">Your {deal.coin} payout address ({deal.network})</Label>
            <p className="text-xs text-muted-foreground">Double-check the address — payouts are irreversible.</p>
            {payoutAlreadySaved && <p className="text-xs text-emerald-600 font-medium">✓ Saved — edit below to change.</p>}
            <div className="flex gap-2">
              <Input id="payoutAddr" value={payoutAddr} onChange={e => setPayoutAddr(e.target.value)} placeholder={`Your ${deal.network} address`} className="flex-1 font-mono text-xs" />
              <Button onClick={savePayout} disabled={paySubmitting || !payoutAddr.trim()}>{paySubmitting ? '…' : payoutAlreadySaved ? 'Update' : 'Save'}</Button>
            </div>
            {payMsg && <p className="text-xs text-emerald-600">{payMsg}</p>}
            {payErr && <p className="text-xs text-destructive">{payErr}</p>}
          </div>
          <NextStep text="Save your payout address and product details below, then continue to In Progress." />
        </ActionCard>
      ) : deal.status === 'Funded' ? (
        <ActionCard title="Step 3 of 6 — Funded: escrow is funded, start your delivery" icon={Send} variant="warning">
          <StepLabel step={3} total={6} label="Escrow funded — start delivering" />
          <p className="text-sm text-muted-foreground mb-3">The buyer has funded the escrow. Review the full deal below, make sure your product &amp; delivery details are saved, then start your delivery to move to In Progress.</p>

          {/* Payout address stays editable here — the buyer funding the escrow
              must never remove the seller's payout field. */}
          <div className="space-y-2 rounded-xl border bg-muted/20 p-3 mb-3">
            <Label htmlFor="payoutAddrFunded">Your {deal.coin} payout address ({deal.network})</Label>
            {payoutAlreadySaved && <p className="text-xs text-emerald-600 font-medium">✓ Saved — edit below to change.</p>}
            <div className="flex gap-2">
              <Input id="payoutAddrFunded" value={payoutAddr} onChange={e => setPayoutAddr(e.target.value)} placeholder={`Your ${deal.network} address`} className="flex-1 font-mono text-xs" />
              <Button onClick={savePayout} disabled={paySubmitting || !payoutAddr.trim()}>{paySubmitting ? '…' : payoutAlreadySaved ? 'Update' : 'Save'}</Button>
            </div>
            {payMsg && <p className="text-xs text-emerald-600">{payMsg}</p>}
            {payErr && <p className="text-xs text-destructive">{payErr}</p>}
          </div>

          {/* Final review of all deal details */}
          <DealReviewSummary deal={deal} partyDetails={partyDetails} />

          {!handoverOk ? (
            <div className="space-y-3">
              {!sellerDetailsSaved && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Save <strong>Your product &amp; delivery details</strong> below before marking as delivered.
                </div>
              )}
              {!payoutAlreadySaved && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ Save <strong>your payout address</strong> above before marking as delivered.
                </div>
              )}
              <NoRollbackBanner text="Only click below after the buyer has actually received everything as agreed. This moves the deal to Delivered — it cannot be undone." />
              {handoverErr && <p className="text-xs text-destructive">⚠️ {handoverErr}</p>}
              <Button onClick={submitHandover} disabled={submittingHandover || !sellerDetailsSaved || !payoutAlreadySaved} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {submittingHandover ? 'Submitting…' : '✓ Mark as delivered to the buyer'}
              </Button>
              <NextStep text="Deal moves to Delivered → the middleman then completes the deal and releases your payout." />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-emerald-600">✓ Marked as delivered!</p>
                <p className="text-xs text-muted-foreground mt-1">The deal is now Delivered. The middleman will complete it and release your payout.</p>
              </div>
              <NextStep text="Middleman completes the deal → payout sent to your saved wallet." />
            </>
          )}

          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Changed your mind? Issue a full voluntary refund:</p>
            {refundErr && <p className="text-xs text-destructive mb-2">{refundErr}</p>}
            {refundOk && <p className="text-xs text-emerald-600 mb-2">✓ Refund submitted.</p>}
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={refunding || refundOk} onClick={handleFreeRefund}>
              {refunding ? 'Processing…' : '↩ Issue free refund to buyer'}
            </Button>
          </div>
        </ActionCard>
      ) : deal.status === 'SellerHandover' || deal.status === 'MiddlemanVerified' ? (
        <ActionCard title="Step 4 of 6 — In Progress: delivering to the buyer" icon={Send} variant="warning">
          <StepLabel step={4} total={6} label="Mark as delivered when you've handed over" />
          <p className="text-sm text-muted-foreground mb-3">You&apos;re delivering to the buyer. Once they have received everything as agreed, mark the deal as delivered.</p>
          <DealReviewSummary deal={deal} partyDetails={partyDetails} />
          <div className="mt-3 space-y-2">
            <NoRollbackBanner text="Only mark as delivered after the buyer has actually received everything. This moves the deal to Delivered — it cannot be undone." />
            {advanceErr && <p className="text-xs text-destructive">⚠️ {advanceErr}</p>}
            <Button onClick={advanceDelivery} disabled={advancing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />{advancing ? 'Submitting…' : '✓ Mark as delivered to the buyer'}
            </Button>
          </div>
          <NextStep text="Deal moves to Delivered → the middleman then completes the deal and releases your payout." />
        </ActionCard>
      ) : deal.status === 'Delivered' ? (
        <ActionCard title="🎉 Delivered — with the middleman" icon={CheckCircle2} variant="success">
          <StepLabel step={5} total={6} label="Middleman is verifying & completing" />
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 mb-3 text-center">
            <p className="font-semibold text-emerald-600">Case submitted to the middleman!</p>
            <p className="text-sm text-muted-foreground mt-1">The middleman is verifying the delivery and will complete the deal. Your payout is released on completion — you&apos;ll be notified by chat/email.</p>
          </div>
          <DealReviewSummary deal={deal} partyDetails={partyDetails} />
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href={dealChatHref(deal.connectionId, 'seller_mm')}><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Contact the middleman</Link>
          </Button>
          <NextStep text="Middleman completes the deal → your payout is released to your wallet." />
        </ActionCard>
      ) : deal.status === 'Approved' || deal.status === 'PayoutQueued' ? (
        <ActionCard title="Payment processing…" icon={Clock} variant="success">
          <StepLabel step={6} total={6} label="Payout in progress" />
          <p className="text-sm text-muted-foreground">The middleman completed the deal. Your payout is being sent to your saved wallet address.</p>
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
                {payMsg && (
                  <DealProgressCTA step="Payout wallet saved" nextLabel="Next: the buyer will fund the escrow. You'll be notified when funds arrive." />
                )}
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
            {/* T&C acknowledgment — seller must confirm before locking */}
            <div className="rounded-lg border bg-muted/20 px-3 py-3 mb-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">By clicking agree you confirm:</p>
              {[
                `The deal amount is ${cents(deal.dealAmountCents)} (${deal.coin} · ${deal.network}).`,
                'Crypto transactions are irreversible — once funded, funds cannot be recalled.',
                'The item being sold does not violate TrustVexa prohibited items policy.',
                'You agree to the TrustVexa terms of service and escrow conditions.',
              ].map((text, i) => (
                <p key={i} className="text-xs text-muted-foreground flex gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{text}</span>
                </p>
              ))}
            </div>
            <Button onClick={handleAgree} disabled={agreeing} className="w-full">
              {agreeing ? 'Recording agreement…' : 'I agree — lock the deal'}
            </Button>
          </ActionCard>
        )
      )}

      {/* Seller product & delivery details — editable from lock through Funded */}
      {(DETAIL_FORM_STATES.has(deal.status) || deal.status === 'Funded') && (
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
          <Button asChild size="sm" variant="outline">
            <Link href={dealChatHref(deal.connectionId, mmChatType(deal.role))}><MessageCircle className="h-3.5 w-3.5 mr-1" /> Contact the middleman</Link>
          </Button>
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
                <Link href={dealChatHref(deal.connectionId, mmChatType(deal.role))}><MessageCircle className="h-3.5 w-3.5 mr-1" /> Open the deal chat</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <ChatLink connectionId={deal.connectionId ?? null} />
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
  const router = useRouter();
  const escrowQuery = useEscrowAddress(dealId, ['Agreed', 'Verified', 'Confirmed', 'Amended', 'Funded'].includes(deal.status));
  const escrow = escrowQuery.data;
  const [txHash, setTxHash] = React.useState('');
  // Read back the saved tx hash so it persists across refreshes.
  const buyerPaymentStatusQ = usePaymentStatus(dealId, true);
  React.useEffect(() => {
    if (buyerPaymentStatusQ.data?.submittedTxHash) {
      setTxHash(buyerPaymentStatusQ.data.submittedTxHash);
    }
  }, [buyerPaymentStatusQ.data?.submittedTxHash]);
  const txAlreadySaved = !!buyerPaymentStatusQ.data?.submittedTxHash;
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payMsg, setPayMsg] = React.useState<string | null>(null);
  const [payErr, setPayErr] = React.useState<string | null>(null);
  const [agreeing, setAgreeing] = React.useState(false);
  const [agreeErr, setAgreeErr] = React.useState<string | null>(null);
  const [agreedResult, setAgreedResult] = React.useState<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean; status?: string } | null>(null);
  const [mmErr, setMmErr] = React.useState<string | null>(null);
  const [requestingMm, setRequestingMm] = React.useState(false);
  const [checkedItems, setCheckedItems] = React.useState({ coinNet: false, amount: false, risk: false });
  const [confirmingFunding, setConfirmingFunding] = React.useState(false);
  const [confirmFundingErr, setConfirmFundingErr] = React.useState<string | null>(null);
  const [submittedToMm, setSubmittedToMm] = React.useState(false);

  const confirmFunding = async () => {
    if (!window.confirm('Confirm you have sent the payment to the escrow address? This advances the deal to the delivery stage.')) return;
    setConfirmingFunding(true); setConfirmFundingErr(null);
    try {
      await apiRequest(`/deals/${dealId}/confirm-funding`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) {
      setConfirmFundingErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to confirm funding.');
    } finally { setConfirmingFunding(false); }
  };

  // Buyer must save receiving details before confirming funding.
  const buyerDetailsSaved = !!(partyDetails?.buyerDetails?.receivingAddress);
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
      setPayMsg('Transaction hash saved.');
      void qc.invalidateQueries({ queryKey: ['payment-status', dealId] });
    } catch (err) { setPayErr(err instanceof Error ? err.message : 'Failed to submit.'); }
    finally { setPaySubmitting(false); }
  };

  const requestMm = async () => {
    setRequestingMm(true); setMmErr(null);
    try {
      await apiRequest(`/deals/${dealId}/request-middleman`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
      void qc.invalidateQueries({ queryKey: ['chats'] });
      void qc.invalidateQueries({ queryKey: ['connections'] });
      // Take the user straight into THIS deal's chat with the middleman that
      // was just assigned (buyer→buyer_mm, seller→seller_mm).
      router.push(dealChatHref(deal.connectionId, mmChatType(deal.role)));
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
          {deal.connectionCode && (
            <Link href={`/connect?open=${deal.connectionId ?? ''}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5">
              <MessageCircle className="h-3 w-3" /> Deal chat: <span className="font-mono font-semibold">{deal.connectionCode}</span>
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Buyer</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">Deal ID: {dealId.slice(0, 8).toUpperCase()}</span> · Seller: {deal.sellerId ? deal.sellerId.slice(0,8) : 'TBD'} · {mmName}
          </p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <SideTrack
        title="🛒 Your buyer track"
        subtitle="Your own steps — independent of the seller"
        accent="blue"
        items={[
          { label: 'Agree & lock the deal', done: !!deal.buyerAgreedAt || reached(deal.status, 'Confirmed'), hint: 'Confirm the terms to lock the deal.' },
          { label: 'Fund the escrow', done: reached(deal.status, 'Funded'), hint: 'Send the exact amount to the escrow address.' },
          { label: 'Add your receiving details', done: buyerDetailsSaved, hint: 'Where you want to receive the item (required).' },
          { label: 'Receive & approve', done: reached(deal.status, 'Approved'), hint: 'Confirm once the seller delivers.' },
          { label: 'Deal complete', done: reached(deal.status, 'Released') || deal.status === 'PartiallySettled' },
        ]}
      />

      {/* Edit before lock — either party may edit the deal terms until both agree */}
      {!deal.lockedAt && !POST_LOCK_STATES.has(deal.status) && (
        <EditDealCard dealId={dealId} deal={deal} onSaved={() => void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] })} />
      )}

      {/* Current action — BUYER */}
      {(deal.status === 'Created' || deal.status === 'Invited') && (
        buyerAlreadyAgreed ? (
          <ActionCard title={dealLockedAt ? '✓ Both parties agreed — deal locked!' : '✓ Your agreement recorded — waiting for seller'} icon={CheckCircle2} variant="success">
            {dealLockedAt ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Both parties agreed. The deal is now locked. You can fund the escrow below to start the deal.</p>
                <DealProgressCTA step="Both parties agreed — deal locked!" nextLabel="Next: send the exact amount to the escrow address shown below. Scroll down to fund." />
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
            <div className="rounded-lg border bg-muted/20 px-3 py-3 mb-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Check all boxes to confirm:</p>
              {[
                { key: 'coinNet', label: `I confirm ${deal.coin} on ${deal.network} is the agreed coin and network.` },
                { key: 'amount', label: `I confirm the deal amount is ${cents(deal.dealAmountCents)} and I will send the exact amount shown.` },
                { key: 'risk', label: 'I understand all crypto transactions are irreversible — sending to the wrong address is a permanent loss.' },
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
              <div className="space-y-1.5">
                <Label htmlFor="txhash">Paste your transaction hash <span className="text-muted-foreground text-xs">(for payment verification)</span></Label>
                {txAlreadySaved && <p className="text-xs text-emerald-600 font-medium">✓ Transaction hash saved.</p>}
                <div className="flex gap-2">
                  <Input id="txhash" value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x… or TX ID" className="flex-1 font-mono text-xs" />
                  <Button variant="outline" onClick={submitTxHash} disabled={paySubmitting || !txHash.trim()}>{paySubmitting ? '…' : txAlreadySaved ? 'Update' : 'Save'}</Button>
                </div>
                {payMsg && <p className="text-xs text-emerald-600">✓ {payMsg}</p>}
                {payErr && <p className="text-xs text-destructive">{payErr}</p>}
              </div>

              {/* Receiving details — buyer fills this before confirming payment */}
              <div className="border-t pt-4">
                <BuyerDetailsForm dealId={dealId} existing={partyDetails?.buyerDetails ?? null} onSaved={() => qc.invalidateQueries({ queryKey: ['party-details', dealId] })} />
              </div>

              {/* Manual progression — buyer confirms they have paid and advances the deal */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-medium">Done paying? Confirm to continue</p>
                <p className="text-xs text-muted-foreground">After sending the exact amount, click below to advance the deal to the delivery stage. The seller will then deliver and submit a handover.</p>
                {!buyerDetailsSaved && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Please fill in and save <strong>Your receiving details</strong> above before continuing — the middleman needs to know where to deliver.
                  </div>
                )}
                {confirmFundingErr && <p className="text-xs text-destructive">⚠️ {confirmFundingErr}</p>}
                <Button onClick={confirmFunding} disabled={confirmingFunding || !buyerDetailsSaved} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {confirmingFunding ? 'Confirming…' : "✓ I've paid — continue to next step"}
                </Button>
              </div>
            </div>
          ) : <Skeleton className="h-32 w-full rounded-xl" />}
          <NextStep text="Seller delivers the item & submits the case → Delivered → the middleman verifies and completes the deal. You'll receive your details by chat / email." />
        </ActionCard>
      )}

      {deal.status === 'Funded' && (
        <ActionCard title="Step 4 of 6 — In Progress: Final review" icon={Shield} variant="success">
          <StepLabel step={4} total={6} label="Final review — submit to middleman" />
          <p className="text-sm text-muted-foreground mb-3">Your funds are locked in escrow and your details are saved. Review the full deal below and submit your details to the middleman.</p>
          <DealReviewSummary deal={deal} partyDetails={partyDetails} />
          {!submittedToMm ? (
            <Button onClick={() => setSubmittedToMm(true)} className="w-full mt-3">
              <Shield className="h-4 w-4 mr-1.5" /> Submit my details to the middleman
            </Button>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-center space-y-1.5">
              <p className="font-semibold text-emerald-600 text-base">🎉 Submitted — congratulations!</p>
              <p className="text-sm text-muted-foreground">
                Your details have been submitted to the middleman. You will receive your account / product
                details by <strong>chat and email</strong> shortly. You can contact the middleman anytime via
                the deal chat, or wait for their reply. The middleman will complete the deal.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-1">
                <Link href={dealChatHref(deal.connectionId, 'buyer_mm')}><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Contact the middleman</Link>
              </Button>
            </div>
          )}
          <NextStep text="Seller submits the case → Delivered → the middleman verifies and completes the deal." />
        </ActionCard>
      )}

      {(deal.status === 'SellerHandover' || deal.status === 'MiddlemanVerified') && (
        <ActionCard title="🎉 Delivered — your order is being completed" icon={Shield} variant="success">
          <StepLabel step={5} total={6} label="Delivered — middleman completing" />
          <p className="text-sm text-muted-foreground mb-3">Your case is now with the middleman, who will verify the delivery and complete the deal. You&apos;ll receive your details by chat / email.</p>
          <DealReviewSummary deal={deal} partyDetails={partyDetails} />
          <NextStep text="The middleman completes the deal and sends your details by chat / email." />
        </ActionCard>
      )}

      {deal.status === 'Delivered' && (
        <ActionCard title="🎉 Delivered — your order is being completed" icon={CheckCircle2} variant="success">
          <StepLabel step={5} total={6} label="Delivered" />

          {/* Congratulations banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 mb-3 text-center space-y-1.5">
            <p className="font-semibold text-emerald-600 text-base">🎉 Congratulations! Your delivery has been received.</p>
            <p className="text-sm text-muted-foreground">
              You will receive your account / product details by <strong>chat and email</strong> shortly.
              The middleman is finalising everything for you.
            </p>
          </div>

          {/* Guidance */}
          <div className="rounded-lg bg-muted/30 border px-3 py-3 mb-3 space-y-1.5 text-sm">
            <p className="text-xs text-muted-foreground">• Your delivery details will be sent to you via <strong>chat or email</strong>.</p>
            <p className="text-xs text-muted-foreground">• Need to talk about the deal? <strong>Contact the middleman</strong> anytime through the deal chat.</p>
            <p className="text-xs text-muted-foreground">• The middleman will complete the deal and release the funds to the seller.</p>
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link href={dealChatHref(deal.connectionId, 'buyer_mm')}><MessageCircle className="h-4 w-4 mr-1.5" /> Contact the middleman</Link>
          </Button>
        </ActionCard>
      )}

      {(deal.status === 'Approved' || deal.status === 'PayoutQueued') && (
        <ActionCard title="Payment processing — almost done!" icon={Clock} variant="success">
          <StepLabel step={6} total={6} label="Payout in progress" />
          <p className="text-sm text-muted-foreground">The middleman completed the deal. The seller&apos;s payment is being processed.</p>
        </ActionCard>
      )}

      {deal.status === 'Released' && (
        <ActionCard title="✓ Deal complete — payment released!" icon={CheckCircle2} variant="success">
          <StepLabel step={6} total={6} label="Complete" />
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-center">
            <p className="font-semibold text-emerald-600">🎉 Deal successfully completed!</p>
            <p className="text-sm text-muted-foreground mt-1">Payment has been processed. Check your email and chat for confirmation details from TrustVexa.</p>
          </div>
        </ActionCard>
      )}

      {deal.status === 'Disputed' && (
        <ActionCard title="Dispute open" icon={AlertTriangle} variant="warning">
          <p className="text-sm text-muted-foreground">The middleman is reviewing your case. Please use the chat to provide evidence.</p>
        </ActionCard>
      )}

      {/* Buyer receiving details are filled inline in the funding card (above),
          so no separate form block is rendered here. */}

      {/* Middleman status */}
      {deal.middlemanId ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
          <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">⚖️ Middleman assigned</p>
            <p className="text-xs text-muted-foreground font-mono">ID: {deal.middlemanId.slice(0,8)}</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={dealChatHref(deal.connectionId, mmChatType(deal.role))}><MessageCircle className="h-3.5 w-3.5 mr-1" /> Contact the middleman</Link>
          </Button>
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
                <Link href={dealChatHref(deal.connectionId, mmChatType(deal.role))}><MessageCircle className="h-3.5 w-3.5 mr-1" /> Open the deal chat</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <ChatLink connectionId={deal.connectionId ?? null} />
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
  const mmPaymentStatus = usePaymentStatus(dealId, ['Funded', 'SellerHandover'].includes(deal.status)).data;
  const [verifying, setVerifying] = React.useState(false);
  const [verifyErr, setVerifyErr] = React.useState<string | null>(null);
  const [delivering, setDelivering] = React.useState(false);
  const [deliverErr, setDeliverErr] = React.useState<string | null>(null);
  const [verifyingParty, setVerifyingParty] = React.useState<'seller' | 'buyer' | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [completeErr, setCompleteErr] = React.useState<string | null>(null);
  // Extended middleman powers
  const [mmBusy, setMmBusy] = React.useState<string | null>(null);
  const [mmActionErr, setMmActionErr] = React.useState<string | null>(null);
  const [mmActionOk, setMmActionOk] = React.useState<string | null>(null);

  const mmOverride = async (key: string, statusOverride: 'Cancelled' | 'Disputed', confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    setMmBusy(key); setMmActionErr(null); setMmActionOk(null);
    try {
      await apiRequest(`/deals/${dealId}/middleman-update`, {
        method: 'PATCH',
        body: { statusOverride, note: `Middleman set status to ${statusOverride}.` },
        idempotencyKey: newIdempotencyKey(),
      });
      setMmActionOk(`Deal marked ${statusOverride}.`);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setMmActionErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Action failed.'); }
    finally { setMmBusy(null); }
  };

  const markComplete = async () => {
    if (!window.confirm('Mark this deal complete and release the payout to the seller? This cannot be undone.')) return;
    setCompleting(true); setCompleteErr(null);
    try {
      await apiRequest(`/deals/${dealId}/complete`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setCompleteErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to complete deal.'); }
    finally { setCompleting(false); }
  };

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
          {deal.connectionCode && (
            <Link href={`/connect?open=${deal.connectionId ?? ''}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5">
              <MessageCircle className="h-3 w-3" /> Deal chat: <span className="font-mono font-semibold">{deal.connectionCode}</span>
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full">⚖️ Middleman</span>
            <StateBadge status={deal.status} />
            <span className="text-xs text-muted-foreground">{deal.coin} · {deal.network}</span>
            <span className="text-xs font-semibold">{cents(deal.dealAmountCents)}</span>
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono text-foreground">Deal ID: {dealId.slice(0,8).toUpperCase()}</span>
            <span>Buyer: {deal.buyerId ? deal.buyerId.slice(0,8) : '—'}</span>
            <span>Seller: {deal.sellerId ? deal.sellerId.slice(0,8) : '—'}</span>
          </div>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/deals"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Deals</Link></Button>
      </div>

      <DealStepper status={deal.status} agreedInProgress={!!(deal.buyerAgreedAt || deal.sellerAgreedAt)} role={deal.role} />

      {/* Middleman: verify the buyer's deposit transaction (Funded onward) */}
      {(deal.status === 'Funded' || deal.status === 'SellerHandover') && (
        <ActionCard title="Verify buyer's deposit" icon={Wallet} description="Confirm the buyer's payment has arrived on-chain before the seller's delivery is released.">
          <ConfirmationCounter dealId={dealId} requiredConfirmations={getRequiredConfirmations(deal.network)} />
          {mmPaymentStatus?.submittedTxHash && (
            <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Buyer-submitted transaction hash</p>
              <p className="font-mono text-xs break-all">{mmPaymentStatus.submittedTxHash}</p>
            </div>
          )}
          {!mmPaymentStatus?.submittedTxHash && (
            <p className="text-xs text-muted-foreground mt-2">The buyer has not pasted a transaction hash. Confirm the deposit via your own on-chain check.</p>
          )}
        </ActionCard>
      )}

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

      {(deal.status === 'Delivered' || deal.status === 'Approved') && (
        <ActionCard title="Complete the deal" icon={CheckCircle2} description="Confirm the buyer has received everything as agreed, then mark the deal complete and release the payout to the seller." variant="warning">
          <NoRollbackBanner text="Marking complete releases the seller's payout. This cannot be undone — confirm both parties are satisfied first." />
          {completeErr && <p className="text-xs text-destructive mt-2">⚠️ {completeErr}</p>}
          <Button onClick={markComplete} disabled={completing} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-1.5" />{completing ? 'Completing…' : 'Mark complete & release payout ✓'}
          </Button>
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

      {/* Middleman powers — available on any active (non-terminal) deal */}
      {!TERMINAL_STATES.has(deal.status) && (
        <ActionCard title="⚖️ Middleman controls" icon={Shield} description="Full control over this deal. Use with care — these actions are audited.">
          <div className="grid gap-2 sm:grid-cols-2">
            {(deal.status === 'Funded' || deal.status === 'SellerHandover' || deal.status === 'MiddlemanVerified' || deal.status === 'Delivered' || deal.status === 'Approved') && (
              <Button size="sm" disabled={!!mmBusy || completing} onClick={markComplete} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />{completing ? 'Completing…' : 'Mark complete & release'}
              </Button>
            )}
            {deal.status !== 'Disputed' && (
              <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                disabled={!!mmBusy} onClick={() => mmOverride('dispute', 'Disputed', 'Mark this deal as Disputed?')}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />{mmBusy === 'dispute' ? '…' : 'Open dispute'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={!!mmBusy} onClick={() => mmOverride('cancel', 'Cancelled', 'Cancel this deal? This is irreversible.')}>
              <X className="h-3.5 w-3.5 mr-1.5" />{mmBusy === 'cancel' ? '…' : 'Cancel deal'}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin"><Shield className="h-3.5 w-3.5 mr-1.5" /> Full admin console</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/messages"><MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Open all chats</Link>
            </Button>
          </div>
          {mmActionErr && <p className="text-xs text-destructive mt-2">⚠️ {mmActionErr}</p>}
          {mmActionOk && <p className="text-xs text-emerald-600 mt-2">✓ {mmActionOk}</p>}
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

      <ChatLink connectionId={deal.connectionId ?? null} />
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
