'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Gavel,
  FileText,
  MessageSquare,
  AlertTriangle,
  Scale,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import { formatUsdCents } from '@/lib/fees';
import { useAuth } from '@/lib/auth/auth-context';

interface EvidenceItem {
  id: string;
  fileHash: string;
  mimeType: string;
  reviewStatus: string;
  locked: boolean;
  url: string;
  createdAt: string;
}

interface DisputeThread {
  id: string;
  status: string;
  locked: boolean;
  createdAt: string;
}

interface DisputeView {
  role: string;
  id: string;
  dealId: string;
  reason: string;
  status: string;
  resolution: string | null;
  decisionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  evidence: EvidenceItem[];
  threads: DisputeThread[];
}

interface DealDetail {
  id: string;
  status: string;
  coin: string;
  network: string;
  isPractice: boolean;
  dealAmountCents: string | null;
  buyerTotalCents: string | null;
  sellerPayoutCents: string | null;
  description?: string;
  buyerId: string;
  sellerId: string;
  middlemanId: string | null;
}

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useAuth();
  const queryClient = useQueryClient();

  const dealId = params.id as string;
  const [outcome, setOutcome] = React.useState<'full_refund' | 'full_release' | 'partial_split'>('full_refund');
  const [resolveReason, setResolveReason] = React.useState('');
  const [buyerShareVal, setBuyerShareVal] = React.useState('');
  const [isResolving, setIsResolving] = React.useState(false);

  // Generate a random idempotency key on component mount to prevent duplicate submissions
  const idempotencyKey = React.useMemo(() => {
    return `dispute-resolve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/login?next=/admin/disputes/${dealId}`);
    }
  }, [status, router, dealId]);

  // Fetch dispute
  const disputeQuery = useQuery({
    queryKey: ['admin-dispute', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: async () => apiRequest<DisputeView>(`/disputes/by-deal/${dealId}`),
  });

  const dispute = disputeQuery.data;

  // Fetch deal details
  const dealQuery = useQuery({
    queryKey: ['admin-deal-detail', dealId],
    enabled: status === 'authenticated' && !!dealId,
    queryFn: async () => apiRequest<DealDetail>(`/dashboard/deals/${dealId}`),
  });

  const deal = dealQuery.data;

  const handleRemoveDispute = async () => {
    if (!confirm('Remove this dispute and return the deal to its normal flow? The deal will move back to Funded so it can be completed.')) return;
    setIsResolving(true);
    try {
      await apiRequest(`/deals/${dealId}/middleman-update`, {
        method: 'PATCH',
        idempotencyKey: `dispute-remove-${Date.now()}`,
        body: { statusOverride: 'Funded', note: 'Dispute resolved over chat; removed by middleman.' },
      });
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', dealId] });
      queryClient.invalidateQueries({ queryKey: ['admin-deal-detail', dealId] });
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      router.push(`/admin/deals/${dealId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove dispute.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveReason.trim() || isResolving) return;

    if (outcome === 'partial_split' && (!buyerShareVal || !/^\d+$/.test(buyerShareVal))) {
      alert('A valid non-negative integer string for buyer share (in smallest unit) is required for a partial split.');
      return;
    }

    setIsResolving(true);
    try {
      await apiRequest(`/disputes/by-deal/${dealId}/resolve`, {
        method: 'POST',
        idempotencyKey: idempotencyKey,
        body: {
          outcome,
          reason: resolveReason,
          ...(outcome === 'partial_split' ? { buyerShareSmallestUnit: buyerShareVal } : {}),
        },
      });

      queryClient.invalidateQueries({ queryKey: ['admin-dispute', dealId] });
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-deal-detail', dealId] });
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
      alert('Failed to resolve dispute. Please check inputs and try again.');
    } finally {
      setIsResolving(false);
    }
  };

  if (status !== 'authenticated' || disputeQuery.isLoading || dealQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-[1fr_350px]">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (disputeQuery.isError || !dispute) {
    return (
      <div className="mx-auto max-w-6xl text-center py-12 space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Dispute Not Found</h2>
        <p className="text-muted-foreground">This deal does not have an active or accessible dispute.</p>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Console
          </Link>
        </Button>
      </div>
    );
  }

  const isOpen = ['open', 'under_review', 'problem_raised', 'disputed'].includes(dispute.status.toLowerCase());

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Console
            </Link>
            <span>/</span>
            <span className="font-mono text-xs">Deal {dealId.slice(0, 8)}</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
            <Scale className="h-7 w-7 text-primary" /> Dispute Mediation
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isOpen ? 'warning' : 'secondary'} className="text-sm px-3 py-1">
            Status: {dispute.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
          {!isOpen && dispute.resolution && (
            <Badge variant="success" className="text-sm px-3 py-1">
              Outcome: {dispute.resolution.replace(/_/g, ' ').toUpperCase()}
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_380px] items-start">
        {/* Left Hand: Overview, Evidence, and Conversation */}
        <div className="space-y-6">
          {/* Dispute Overview Card */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-base flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                Case details
              </CardTitle>
              <CardDescription>Initiation parameters and metadata.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Dispute ID</span>
                <span className="font-mono text-xs font-semibold break-all">{dispute.id}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Category / Reason</span>
                <span className="text-sm font-semibold capitalize">{dispute.reason.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block font-medium">Opened on</span>
                <span className="text-sm font-semibold">{new Date(dispute.createdAt).toLocaleString()}</span>
              </div>
              {dispute.resolvedAt && (
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Resolved on</span>
                  <span className="text-sm font-semibold">{new Date(dispute.resolvedAt).toLocaleString()}</span>
                </div>
              )}
              {dispute.decisionNote && (
                <div className="sm:col-span-2 bg-muted/20 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block font-semibold mb-1">Final decision note</span>
                  <p className="text-sm text-foreground italic whitespace-pre-wrap">{dispute.decisionNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal Details Card */}
          {deal && (
            <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
              <CardHeader className="border-b bg-muted/10">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Associated escrow terms
                </CardTitle>
                <CardDescription>Escrow amount, party accounts, and coins.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Escrow size</span>
                  <span className="text-base font-bold text-primary">
                    {deal.dealAmountCents ? formatUsdCents(Number(deal.dealAmountCents)) : '\u2014'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Coin / Chain</span>
                  <span className="text-sm font-semibold uppercase">{deal.coin} ({deal.network})</span>
                </div>
                <div className="sm:col-span-3 border-t pt-3 grid gap-2 text-xs text-muted-foreground font-mono">
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Buyer ID:</span>
                    <span className="text-foreground select-all break-all text-right">{deal.buyerId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Seller ID:</span>
                    <span className="text-foreground select-all break-all text-right">{deal.sellerId}</span>
                  </div>
                </div>
                {deal.description && (
                  <div className="sm:col-span-3 border-t pt-3">
                    <span className="text-xs text-muted-foreground block font-medium">Deal description</span>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{deal.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resolve-over-chat note */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                How to resolve this dispute
              </CardTitle>
              <CardDescription>Gather evidence and talk to both parties in the deal chat.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3 text-sm text-muted-foreground">
              <p>Use the buyer↔middleman and seller↔middleman chats to collect evidence and discuss the issue directly with each party.</p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/deals/${dealId}`}>
                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Open the deal &amp; chats
                </Link>
              </Button>
              <p className="text-xs">Once you have what you need, issue a ruling on the right — or remove the dispute to return the deal to its normal flow.</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Hand: Mediation Resolution Action Panel */}
        <div className="space-y-6">
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Mediation decision
              </CardTitle>
              <CardDescription>Issue a formal ruling and release, refund, or split escrow funds.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isOpen ? (
                <form onSubmit={handleResolveDispute} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Outcome type</label>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        variant={outcome === 'full_refund' ? 'default' : 'outline'}
                        className="justify-start text-xs font-semibold"
                        onClick={() => setOutcome('full_refund')}
                      >
                        <ShieldCheck className="h-4 w-4 mr-2" /> Full Refund to Buyer
                      </Button>
                      <Button
                        type="button"
                        variant={outcome === 'full_release' ? 'default' : 'outline'}
                        className="justify-start text-xs font-semibold"
                        onClick={() => setOutcome('full_release')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Full Release to Seller
                      </Button>
                      <Button
                        type="button"
                        variant={outcome === 'partial_split' ? 'default' : 'outline'}
                        className="justify-start text-xs font-semibold"
                        onClick={() => setOutcome('partial_split')}
                      >
                        <Scale className="h-4 w-4 mr-2" /> Partial Split
                      </Button>
                    </div>
                  </div>

                  {outcome === 'partial_split' && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Buyer share (smallest units)</label>
                      <Input
                        type="text"
                        placeholder="e.g. 500000000 (satoshis / wei)"
                        value={buyerShareVal}
                        onChange={(e) => setBuyerShareVal(e.target.value)}
                        className="text-xs"
                        required
                      />
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        Specify the exact buyer share in the smallest unit of the coin (e.g., satoshis for BTC, wei for ETH). The remainder will be released to the seller.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Ruling justification</label>
                    <Textarea
                      placeholder="Detail the analysis of evidence and legal grounds for this decision..."
                      value={resolveReason}
                      onChange={(e) => setResolveReason(e.target.value)}
                      className="text-xs min-h-[120px]"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      This statement is appended to the official deal timeline and will be permanently recorded in the dispute decision PDF.
                    </p>
                  </div>

                  <Button type="submit" variant="gradient" className="w-full font-bold text-xs" disabled={isResolving || !resolveReason.trim()}>
                    {isResolving ? 'Processing resolution...' : 'Issue mediation ruling'}
                  </Button>

                  <div className="border-t pt-3 mt-1">
                    <p className="text-[10px] text-muted-foreground mb-2 leading-normal">
                      Resolved the issue over chat? Remove the dispute to return the deal to its normal flow (back to Funded) so it can be completed.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      disabled={isResolving}
                      onClick={handleRemoveDispute}
                    >
                      {isResolving ? 'Working…' : 'Remove dispute (return to deal)'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-center py-6">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm">Dispute Closed</h3>
                    <p className="text-xs text-muted-foreground">This case was mediated and closed.</p>
                  </div>
                  <div className="border rounded-xl p-3 bg-muted/20 text-xs text-left space-y-2">
                    <div>
                      <span className="text-muted-foreground block font-medium">Outcome applied:</span>
                      <Badge variant="success" className="font-semibold">{dispute.resolution?.replace(/_/g, ' ').toUpperCase()}</Badge>
                    </div>
                    {dispute.decisionNote && (
                      <div>
                        <span className="text-muted-foreground block font-medium">Decision grounds:</span>
                        <p className="text-foreground italic">{dispute.decisionNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
