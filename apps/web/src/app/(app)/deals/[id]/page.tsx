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
  Wallet, UserPlus, KeyRound, Send,
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
import { formatUsdCents } from '@/lib/fees';

/** Extended deal detail — includes fields the API returns but the base type omits */
type DealDetail = BaseDealDetail & {
  middlemanId?: string | null;
  itemDescription?: string | null;
  terms?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

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

  return (
    <div className="rounded-xl border">
      {/* Always-visible summary row */}
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm border-b">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Deal amount</span>
          <span className="font-semibold">{cents(deal.dealAmountCents)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Buyer sends</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{cents(deal.buyerTotalCents)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Platform fee</span>
          <span>{cents(deal.platformFeeCents)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Seller receives</span>
          <span className="font-semibold text-emerald-600">{cents(deal.sellerPayoutCents)}</span>
        </div>
      </div>

      {/* Expand for more */}
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /> Full deal details & documents</span>
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
  const [deliveryMethod, setDeliveryMethod] = React.useState(existing?.deliveryMethod ?? 'Email');
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
            <Label htmlFor="sd-method">Delivery method</Label>
            <select id="sd-method" value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>Email</option><option>Download Link</option><option>Account Transfer</option><option>Other</option>
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
  const [platform, setPlatform] = React.useState(existing?.receivingPlatform ?? 'Email');
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
            <Label htmlFor="bd-platform">Receiving via</Label>
            <select id="bd-platform" value={platform} onChange={e => setPlatform(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>Email</option><option>Telegram</option><option>Discord</option><option>Wallet Address</option><option>Other</option>
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
  const [terms, setTerms] = React.useState(deal.terms ?? '');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState(false);

  const save = async () => {
    setSaving(true); setErr(null); setOk(false);
    try {
      await apiRequest(`/deals/${dealId}`, {
        method: 'PATCH',
        body: { itemDescription: desc, terms: terms || undefined },
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
          <span className="text-xs text-muted-foreground">(before buyer joins)</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t px-4 py-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc" className="text-sm">Item description</Label>
            <textarea id="edit-desc" rows={2} value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe what you're selling" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-terms" className="text-sm">Deal terms <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <textarea id="edit-terms" rows={3} value={terms} onChange={e => setTerms(e.target.value)}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Conditions, deliverables, acceptance criteria…" />
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          {ok && <p className="text-xs text-emerald-600">✓ Saved.</p>}
          <Button size="sm" onClick={save} disabled={saving} className="w-full">{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      )}
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
  const [verCode, setVerCode] = React.useState<string | null>(null);
  const [verCodeExpiry, setVerCodeExpiry] = React.useState<string | null>(null);
  const [gettingCode, setGettingCode] = React.useState(false);
  const [codeErr, setCodeErr] = React.useState<string | null>(null);
  const [codeCopied, setCodeCopied] = React.useState(false);
  const [payoutAddr, setPayoutAddr] = React.useState('');
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payMsg, setPayMsg] = React.useState<string | null>(null);
  const [payErr, setPayErr] = React.useState<string | null>(null);
  const [mmErr, setMmErr] = React.useState<string | null>(null);
  const [requestingMm, setRequestingMm] = React.useState(false);
  const [sellerCodeInput, setSellerCodeInput] = React.useState('');
  const [submittingCode, setSubmittingCode] = React.useState(false);
  const [submitCodeErr, setSubmitCodeErr] = React.useState<string | null>(null);
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

  const getVerCode = async () => {
    setGettingCode(true); setCodeErr(null);
    try {
      const r = await apiRequest<{ code: string; expiresAt: string }>(`/deals/${dealId}/verification-code`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      setVerCode(r.code); setVerCodeExpiry(r.expiresAt);
    } catch (err) { setCodeErr(err instanceof Error ? err.message : 'Failed to get code.'); }
    finally { setGettingCode(false); }
  };

  const submitBuyerCode = async () => {
    if (!sellerCodeInput.trim()) return;
    setSubmittingCode(true); setSubmitCodeErr(null);
    try {
      await apiRequest(`/deals/${dealId}/verification-code/verify`, { method: 'POST', body: { code: sellerCodeInput.trim() }, idempotencyKey: newIdempotencyKey() });
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setSubmitCodeErr(err instanceof Error ? err.message : 'Invalid code.'); }
    finally { setSubmittingCode(false); }
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
      const result = await apiRequest<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean }>(
        `/deals/${dealId}/agree`, { method: 'POST', idempotencyKey: newIdempotencyKey() }
      );
      setAgreedResult(result);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setAgreeErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to agree.'); }
    finally { setAgreeing(false); }
  };

  const isPostLock = POST_LOCK_STATES.has(deal.status);
  const counterparty = deal.buyerId ? 'Buyer connected' : 'Waiting for buyer';
  const mmName = deal.middlemanId ? `⚖️ Middleman assigned` : 'No middleman yet';

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

      {/* Edit before lock — seller can modify the deal while it's not yet locked */}
      {(deal.status === 'Created' || deal.status === 'Invited') && !deal.buyerId && (
        <EditDealCard dealId={dealId} deal={deal} onSaved={() => qc.invalidateQueries({ queryKey: ['deal-detail', dealId] })} />
      )}

      {/* Current action — SELLER */}
      {deal.status === 'Created' || deal.status === 'Invited' ? (
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
      ) : deal.status === 'Agreed' ? (
        <ActionCard title="Step 1: Get your verification code" icon={KeyRound} description="Get a one-time code and share it with the buyer to advance the deal.">
          <div className="space-y-3">
            {codeErr && <p className="text-xs text-destructive">{codeErr}</p>}
            {verCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">{verCode}</code>
                  <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(verCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); }}>{codeCopied ? '✓' : <Copy className="h-3.5 w-3.5" />}</Button>
                </div>
                {verCodeExpiry && <p className="text-xs text-muted-foreground">Expires: {fmtDate(verCodeExpiry)}</p>}
              </div>
            ) : (
              <Button onClick={getVerCode} disabled={gettingCode} className="w-full">{gettingCode ? 'Generating…' : 'Get verification code'}</Button>
            )}
          </div>
        </ActionCard>
      ) : deal.status === 'Verified' ? (
        <ActionCard title="Verify the buyer's code" icon={KeyRound} description="Enter the code the buyer shared with you to confirm the identity exchange.">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={sellerCodeInput} onChange={e => setSellerCodeInput(e.target.value)} placeholder="Enter buyer's verification code" className="flex-1 font-mono" />
              <Button onClick={submitBuyerCode} disabled={submittingCode || !sellerCodeInput.trim()}>{submittingCode ? '…' : 'Verify'}</Button>
            </div>
            {submitCodeErr && <p className="text-xs text-destructive">{submitCodeErr}</p>}
          </div>
        </ActionCard>
      ) : deal.status === 'Confirmed' || deal.status === 'Amended' ? (
        <ActionCard title="Deal confirmed — waiting for buyer to fund" icon={Wallet} variant="success">
          <p className="text-sm text-muted-foreground mb-3">Once the buyer sends the funds to escrow, you'll be notified to proceed with delivery.</p>
          <div className="space-y-2">
            <Label htmlFor="payoutAddr">Your {deal.coin} payout address ({deal.network})</Label>
            <p className="text-xs text-muted-foreground">Enter where you want to receive your payout after delivery is approved.</p>
            <div className="flex gap-2">
              <Input id="payoutAddr" value={payoutAddr} onChange={e => setPayoutAddr(e.target.value)} placeholder={`Your ${deal.network} address`} className="flex-1 font-mono text-xs" />
              <Button onClick={savePayout} disabled={paySubmitting || !payoutAddr.trim()}>{paySubmitting ? '…' : 'Save'}</Button>
            </div>
            {payMsg && <p className="text-xs text-emerald-600">{payMsg}</p>}
            {payErr && <p className="text-xs text-destructive">{payErr}</p>}
          </div>
        </ActionCard>
      ) : deal.status === 'Funded' ? (
        <ActionCard title="Deal is funded — deliver the item now" icon={Send} variant="warning">
          <p className="text-sm text-muted-foreground">The buyer has paid into escrow. Fill in your delivery details below, then deliver the item to the buyer as agreed.</p>
        </ActionCard>
      ) : deal.status === 'SellerHandover' ? (
        <ActionCard title="Handover sent — waiting for middleman verification" icon={Shield} variant="success">
          <p className="text-sm text-muted-foreground">The middleman will verify your handover and confirm delivery to the buyer.</p>
        </ActionCard>
      ) : deal.status === 'MiddlemanVerified' || deal.status === 'Delivered' ? (
        <ActionCard title="Delivered — waiting for buyer approval" icon={CheckCircle2} variant="success">
          <p className="text-sm text-muted-foreground">The buyer is in their inspection window. Once they approve, payout will be released to you.</p>
        </ActionCard>
      ) : deal.status === 'Approved' || deal.status === 'PayoutQueued' ? (
        <ActionCard title="Payout processing…" icon={Clock} variant="success">
          <p className="text-sm text-muted-foreground">Buyer approved the delivery. Your payout is being processed to your wallet.</p>
        </ActionCard>
      ) : deal.status === 'Released' ? (
        <ActionCard title="✓ Deal complete — payout released!" icon={CheckCircle2} variant="success">
          <p className="text-sm text-muted-foreground">Funds have been sent to your payout address.</p>
        </ActionCard>
      ) : deal.status === 'Disputed' ? (
        <ActionCard title="Dispute opened" icon={AlertTriangle} variant="warning">
          <p className="text-sm text-muted-foreground">The middleman is reviewing the dispute. You can submit evidence and comments in the chat.</p>
        </ActionCard>
      ) : null}

      {/* Agree button for Invited/Created status when buyer joined */}
      {(deal.status === 'Created' || deal.status === 'Invited') && deal.buyerId && (
        agreedResult?.sellerAgreed ? (
          <ActionCard title={agreedResult.locked ? '✓ Both parties agreed — deal locked!' : '✓ You agreed — waiting for buyer'} icon={CheckCircle2} variant="success">
            <p className="text-sm text-muted-foreground">
              {agreedResult.locked
                ? 'Both parties agreed. The deal is now locked and the buyer can proceed to fund the escrow.'
                : 'Your agreement is recorded. The deal will lock once the buyer also agrees.'}
            </p>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Seller receives</span><span className="font-semibold text-emerald-600">{cents(deal.sellerPayoutCents)}</span></div>
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

      {/* Request middleman */}
      {!deal.middlemanId && !TERMINAL_STATES.has(deal.status) && deal.status !== 'Disputed' && (
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
  const escrowQuery = useEscrowAddress(dealId, ['Confirmed', 'Amended', 'Funded'].includes(deal.status));
  const escrow = escrowQuery.data;
  const [txHash, setTxHash] = React.useState('');
  const [paySubmitting, setPaySubmitting] = React.useState(false);
  const [payMsg, setPayMsg] = React.useState<string | null>(null);
  const [payErr, setPayErr] = React.useState<string | null>(null);
  const [agreeing, setAgreeing] = React.useState(false);
  const [agreeErr, setAgreeErr] = React.useState<string | null>(null);
  const [agreedResult, setAgreedResult] = React.useState<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean } | null>(null);
  const [mmErr, setMmErr] = React.useState<string | null>(null);
  const [requestingMm, setRequestingMm] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [approveErr, setApproveErr] = React.useState<string | null>(null);
  const [disputing, setDisputing] = React.useState(false);
  const [disputeErr, setDisputeErr] = React.useState<string | null>(null);
  const [verCode, setVerCode] = React.useState<string | null>(null);
  const [verCodeExpiry, setVerCodeExpiry] = React.useState<string | null>(null);
  const [gettingCode, setGettingCode] = React.useState(false);
  const [codeErr, setCodeErr] = React.useState<string | null>(null);
  const [codeCopied, setCodeCopied] = React.useState(false);
  const [checkedItems, setCheckedItems] = React.useState({ coinNet: false, amount: false, risk: false });

  const isPostLock = POST_LOCK_STATES.has(deal.status);

  const handleAgree = async () => {
    setAgreeing(true); setAgreeErr(null);
    try {
      const result = await apiRequest<{ buyerAgreed: boolean; sellerAgreed: boolean; locked: boolean }>(
        `/deals/${dealId}/agree`, { method: 'POST', idempotencyKey: newIdempotencyKey() }
      );
      setAgreedResult(result);
      void qc.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    } catch (err) { setAgreeErr(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to agree.'); }
    finally { setAgreeing(false); }
  };

  const getVerCode = async () => {
    setGettingCode(true); setCodeErr(null);
    try {
      const r = await apiRequest<{ code: string; expiresAt: string }>(`/deals/${dealId}/verification-code`, { method: 'POST', idempotencyKey: newIdempotencyKey() });
      setVerCode(r.code); setVerCodeExpiry(r.expiresAt);
    } catch (err) { setCodeErr(err instanceof Error ? err.message : 'Failed to get code.'); }
    finally { setGettingCode(false); }
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
        agreedResult?.buyerAgreed ? (
          <ActionCard title={agreedResult.locked ? '✓ Both parties agreed — deal locked!' : '✓ Your agreement recorded — waiting for seller'} icon={CheckCircle2} variant="success">
            <p className="text-sm text-muted-foreground">
              {agreedResult.locked
                ? 'Both parties agreed. You can now fund the escrow to start the deal.'
                : 'Your agreement is recorded. The deal will advance once the seller also agrees.'}
            </p>
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
              <div className="flex justify-between text-primary font-semibold"><span>You will send</span><span>{cents(deal.buyerTotalCents)}</span></div>
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

      {deal.status === 'Agreed' && (
        <ActionCard title="Get verification code from seller" icon={KeyRound} description="Ask the seller for their verification code, then come back to enter it here.">
          <p className="text-sm text-muted-foreground">The seller will share a one-time code with you. This confirms both parties are legitimate.</p>
        </ActionCard>
      )}

      {deal.status === 'Verified' && (
        <ActionCard title="Share your verification code with the seller" icon={KeyRound} description="Get your code and share it with the seller. They will enter it to advance the deal.">
          <div className="space-y-3">
            {codeErr && <p className="text-xs text-destructive">{codeErr}</p>}
            {verCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm break-all">{verCode}</code>
                  <Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(verCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 1500); }}>{codeCopied ? '✓' : <Copy className="h-3.5 w-3.5" />}</Button>
                </div>
                {verCodeExpiry && <p className="text-xs text-muted-foreground">Expires: {fmtDate(verCodeExpiry)}</p>}
              </div>
            ) : (
              <Button onClick={getVerCode} disabled={gettingCode} className="w-full">{gettingCode ? 'Generating…' : 'Get my verification code'}</Button>
            )}
          </div>
        </ActionCard>
      )}

      {(deal.status === 'Confirmed' || deal.status === 'Amended') && (
        <ActionCard title="Fund the escrow" icon={Wallet} description={`Send exactly the required amount of ${deal.coin} on ${deal.network} to the address below.`}>
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
        </ActionCard>
      )}

      {deal.status === 'Funded' && (
        <ActionCard title="Waiting for seller to deliver" icon={Clock} variant="success">
          <p className="text-sm text-muted-foreground">Funds are safely held in escrow. The seller is preparing your delivery.</p>
        </ActionCard>
      )}

      {(deal.status === 'SellerHandover' || deal.status === 'MiddlemanVerified') && (
        <ActionCard title="Middleman is verifying delivery" icon={Shield} variant="success">
          <p className="text-sm text-muted-foreground">The middleman is reviewing the seller's handover. You'll be notified when delivery is confirmed.</p>
        </ActionCard>
      )}

      {deal.status === 'Delivered' && (
        <ActionCard title="Delivery confirmed — inspect & approve" icon={CheckCircle2} variant="warning">
          <p className="text-sm text-muted-foreground mb-4">The item has been delivered. Review it carefully. If everything matches the agreement, approve to release the payout to the seller.</p>
          {approveErr && <p className="text-xs text-destructive mb-2">{approveErr}</p>}
          {disputeErr && <p className="text-xs text-destructive mb-2">{disputeErr}</p>}
          <div className="flex gap-3">
            <Button onClick={handleApprove} disabled={approving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />{approving ? 'Approving…' : 'Approve & release payout'}
            </Button>
            <Button onClick={openDispute} disabled={disputing} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10">
              {disputing ? '…' : 'Open dispute'}
            </Button>
          </div>
        </ActionCard>
      )}

      {(deal.status === 'Approved' || deal.status === 'PayoutQueued') && (
        <ActionCard title="Payout in progress…" icon={Clock} variant="success">
          <p className="text-sm text-muted-foreground">You approved the delivery. The seller's payout is processing.</p>
        </ActionCard>
      )}

      {deal.status === 'Released' && (
        <ActionCard title="✓ Deal complete" icon={CheckCircle2} variant="success">
          <p className="text-sm text-muted-foreground">The deal is settled. Thank you for using TrustVexa.</p>
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

      {/* Request middleman */}
      {!deal.middlemanId && !TERMINAL_STATES.has(deal.status) && deal.status !== 'Disputed' && (
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
