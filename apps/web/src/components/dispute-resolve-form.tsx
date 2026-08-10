'use client';

/**
 * Mediator dispute-resolution form (task 7.5). Renders only for the assigned
 * mediator of a deal whose dispute is still open. The server re-validates the
 * caller, the dispute state, and the settlement math, so this is UX only. A
 * partial split asks for the buyer's smallest-unit share; full refund/release
 * do not. On success it shows the outcome and the generated decision document
 * number.
 */
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type {
  DisputeOutcome,
  DisputeResolveRequest,
  DisputeResolveResponse,
} from '@/lib/api/types';
import { ConfirmMoneyDialog } from '@/components/ui/confirm-money-dialog';

export function DisputeResolveForm({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = React.useState<DisputeOutcome>('full_refund');
  const [reason, setReason] = React.useState('');
  const [buyerShare, setBuyerShare] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: DisputeResolveRequest = { outcome, reason: reason.trim() };
      if (outcome === 'partial_split') {
        body.buyerShareSmallestUnit = buyerShare.trim();
      }
      return apiRequest<DisputeResolveResponse>(`/disputes/by-deal/${dealId}/resolve`, {
        method: 'POST',
        body,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['deal-detail', dealId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
    },
  });

  if (mutation.isSuccess) {
    const r = mutation.data;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dispute resolved</CardTitle>
          <CardDescription>
            Outcome: {r.outcome.replace('_', ' ')} — deal is now {r.toState}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            Refunded to buyer: <span className="font-mono">{r.toBuyerSmallestUnit}</span> · Released
            to seller: <span className="font-mono">{r.toSellerSmallestUnit}</span>
          </p>
          <p className="text-muted-foreground">Decision document: {r.decisionDocumentNumber}</p>
        </CardContent>
      </Card>
    );
  }

  const reasonValid = reason.trim().length > 0;
  const shareValid = outcome !== 'partial_split' || /^\d+$/.test(buyerShare.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolve dispute</CardTitle>
        <CardDescription>
          Choose how to settle the escrow. This moves money and is recorded in the audit log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="outcome">Outcome</Label>
          <select
            id="outcome"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as DisputeOutcome)}
          >
            <option value="full_refund">Full refund to buyer</option>
            <option value="full_release">Full release to seller</option>
            <option value="partial_split">Partial split</option>
          </select>
        </div>

        {outcome === 'partial_split' ? (
          <div className="space-y-2">
            <Label htmlFor="buyerShare">Buyer share (smallest units)</Label>
            <Input
              id="buyerShare"
              inputMode="numeric"
              placeholder="e.g. 1500000"
              value={buyerShare}
              onChange={(e) => setBuyerShare(e.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="reason">Decision reason</Label>
          <textarea
            id="reason"
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Why this outcome was chosen (recorded on the decision PDF)."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : 'Could not resolve the dispute.'}
          </p>
        ) : null}

        <ConfirmMoneyDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            mutation.mutate();
          }}
          title="Resolve Dispute"
          description={`You are about to resolve the dispute with the following outcome: ${outcome.replace('_', ' ')}. This action will distribute the escrowed funds and finalize the transaction.`}
          amountText={
            outcome === 'partial_split'
              ? `Split (Buyer Share: ${buyerShare})`
              : outcome.replace('_', ' ')
          }
          isSubmitting={mutation.isPending}
        />
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={!reasonValid || !shareValid || mutation.isPending}
        >
          {mutation.isPending ? 'Resolving…' : 'Resolve dispute'}
        </Button>
      </CardContent>
    </Card>
  );
}
