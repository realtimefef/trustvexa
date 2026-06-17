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
  Send,
  AlertTriangle,
  Scale,
  CheckCircle2,
  FileCode,
  Download,
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

interface DisputeMessage {
  id: string;
  threadId: string;
  senderId: string | null;
  role: string;
  body: string;
  createdAt: string;
}

interface DisputeMessagesResponse {
  disputeId: string;
  role: string;
  messages: DisputeMessage[];
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
  const [messageVal, setMessageVal] = React.useState('');
  const [outcome, setOutcome] = React.useState<'full_refund' | 'full_release' | 'partial_split'>('full_refund');
  const [resolveReason, setResolveReason] = React.useState('');
  const [buyerShareVal, setBuyerShareVal] = React.useState('');
  const [isResolving, setIsResolving] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

  // Generate a random idempotency key on component mount to prevent duplicate submissions
  const idempotencyKey = React.useMemo(() => {
    return `dispute-resolve-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  const messageIdempotencyPrefix = React.useRef(Date.now());
  const [messageCounter, setMessageCounter] = React.useState(0);

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

  // Fetch dispute messages (once dispute ID is available)
  const messagesQuery = useQuery({
    queryKey: ['admin-dispute-messages', dispute?.id],
    enabled: status === 'authenticated' && !!dispute?.id,
    queryFn: async () => apiRequest<DisputeMessagesResponse>(`/disputes/${dispute!.id}/messages`),
  });

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageVal.trim() || !dispute?.id || isSending) return;

    setIsSending(true);
    const counter = messageCounter + 1;
    setMessageCounter(counter);
    const key = `dispute-msg-${messageIdempotencyPrefix.current}-${counter}`;

    try {
      await apiRequest(`/disputes/${dispute.id}/messages`, {
        method: 'POST',
        idempotencyKey: key,
        body: { body: messageVal },
      });
      setMessageVal('');
      queryClient.invalidateQueries({ queryKey: ['admin-dispute-messages', dispute.id] });
    } catch (err) {
      console.error('Failed to post statement:', err);
    } finally {
      setIsSending(false);
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

  const messages = messagesQuery.data?.messages ?? [];
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
        <div className="flex items-center gap-2">
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
                <span className="font-mono text-xs font-semibold">{dispute.id}</span>
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
                  <div className="flex justify-between">
                    <span>Buyer ID:</span>
                    <span className="text-foreground select-all">{deal.buyerId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Seller ID:</span>
                    <span className="text-foreground select-all">{deal.sellerId}</span>
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

          {/* Evidence Files Card */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="h-4 w-4 text-primary" />
                Submitted evidence
              </CardTitle>
              <CardDescription>Files uploaded by the parties to justify their claims.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {dispute.evidence.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No evidence files uploaded yet.</p>
              ) : (
                <ul className="divide-y border rounded-xl overflow-hidden bg-card/40">
                  {dispute.evidence.map((ev) => (
                    <li key={ev.id} className="flex items-center justify-between p-4 gap-4 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">Evidence file</span>
                          <Badge variant={ev.reviewStatus === 'approved' ? 'success' : ev.reviewStatus === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px]">
                            {ev.reviewStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">Hash: {ev.fileHash}</p>
                        <p className="text-[10px] text-muted-foreground">Type: {ev.mimeType} · Uploaded: {new Date(ev.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5 h-8">
                        <a href={ev.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3 w-3" /> View
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Discussion Thread Card */}
          <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="border-b bg-muted/10 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Mediation thread statements
              </CardTitle>
              <CardDescription>Direct testimonies and responses from buyer, seller, and system.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {messagesQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-2/3" />
                  <Skeleton className="h-10 w-1/2" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">No statements registered in the thread.</p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {messages.map((msg) => {
                    const isSystem = msg.role === 'system';
                    const isMiddleman = msg.role === 'middleman';
                    const isBuyer = msg.role === 'buyer';

                    return (
                      <li
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] rounded-xl p-3 border text-sm shadow-soft ${
                          isSystem
                            ? 'self-center bg-muted/40 border-muted text-muted-foreground max-w-full text-center text-xs'
                            : isMiddleman
                            ? 'self-end bg-brand-gradient text-white border-transparent'
                            : isBuyer
                            ? 'self-start bg-primary/[0.06] border-primary/20 text-foreground'
                            : 'self-start bg-card border-border/60 text-foreground'
                        }`}
                      >
                        {!isSystem && (
                          <span className={`text-[10px] font-bold uppercase tracking-wide block mb-1 ${isMiddleman ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {msg.role} {msg.senderId ? `(${msg.senderId.slice(0, 6)})` : ''}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <span className={`text-[9px] mt-1.5 block text-right ${isMiddleman ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
            {isOpen && (
              <form onSubmit={handlePostMessage} className="p-4 border-t bg-muted/10 flex gap-2 items-center shrink-0">
                <Input
                  type="text"
                  placeholder="Post an official mediator statement..."
                  value={messageVal}
                  onChange={(e) => setMessageVal(e.target.value)}
                  disabled={isSending}
                  className="flex-1 h-9 text-xs"
                />
                <Button type="submit" size="icon" disabled={!messageVal.trim() || isSending} className="h-9 w-9 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
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
