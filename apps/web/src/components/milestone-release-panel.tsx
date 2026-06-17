'use client';

/**
 * Middleman milestone-release panel (task 7.2). Renders only for the assigned
 * middleman of a deal in `PayoutQueued`. It lets the operator mark a delivery-
 * checklist item complete and release a milestone (a partial seller payout out
 * of escrow). The server re-validates the caller, the deal state, the checklist
 * completeness, and the escrow conservation, so this is UX only — every action
 * carries an Idempotency-Key and runs under the money-write contract.
 */
import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { ConfirmMoneyDialog } from '@/components/ui/confirm-money-dialog';

interface ReleaseResult {
  milestoneId: string;
  releasedSmallestUnit: string;
  cumulativeReleasedSmallestUnit: string;
  isFinal: boolean;
  toState: string;
}

export function MilestoneReleasePanel({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [milestoneId, setMilestoneId] = React.useState('');
  const [checklistType, setChecklistType] = React.useState<'account_sale' | 'digital_product'>(
    'digital_product',
  );
  const [itemKey, setItemKey] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['deal-detail', dealId] });
    void queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
  };

  const markChecklist = useMutation({
    mutationFn: async () =>
      apiRequest<{ checked: boolean }>(`/handover/deals/${dealId}/checklist`, {
        method: 'POST',
        body: { checklistType, itemKey: itemKey.trim() },
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
    onSuccess: invalidate,
  });

  const release = useMutation({
    mutationFn: async () =>
      apiRequest<ReleaseResult>(
        `/handover/deals/${dealId}/milestones/${milestoneId.trim()}/release`,
        { method: 'POST', idempotencyKey: newIdempotencyKey() },
      ),
    retry: false,
    onSuccess: invalidate,
  });

  const checklistValid = itemKey.trim().length > 0;
  const milestoneValid = /^[0-9a-f-]{16,}$/i.test(milestoneId.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Milestones &amp; delivery</CardTitle>
        <CardDescription>
          Mark delivery-checklist items complete, then release each milestone. Releases move money
          out of escrow and are recorded in the ledger.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Mark a delivery-checklist item</p>
          <div className="space-y-2">
            <Label htmlFor="checklistType">Checklist type</Label>
            <select
              id="checklistType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={checklistType}
              onChange={(e) =>
                setChecklistType(e.target.value as 'account_sale' | 'digital_product')
              }
            >
              <option value="digital_product">Digital product</option>
              <option value="account_sale">Account sale</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="itemKey">Item key</Label>
            <Input
              id="itemKey"
              placeholder="e.g. access_tested"
              value={itemKey}
              onChange={(e) => setItemKey(e.target.value)}
            />
          </div>
          {markChecklist.isError ? (
            <p className="text-sm text-destructive">
              {markChecklist.error instanceof ApiError
                ? markChecklist.error.message
                : 'Could not update the checklist.'}
            </p>
          ) : null}
          {markChecklist.isSuccess ? (
            <p className="text-sm text-emerald-600">Checklist item recorded.</p>
          ) : null}
          <Button
            variant="outline"
            disabled={!checklistValid || markChecklist.isPending}
            onClick={() => markChecklist.mutate()}
          >
            {markChecklist.isPending ? 'Saving…' : 'Mark item complete'}
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">Release a milestone</p>
          <div className="space-y-2">
            <Label htmlFor="milestoneId">Milestone ID</Label>
            <Input
              id="milestoneId"
              placeholder="milestone UUID"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
            />
          </div>
          {release.isError ? (
            <p className="text-sm text-destructive">
              {release.error instanceof ApiError
                ? release.error.message
                : 'Could not release the milestone.'}
            </p>
          ) : null}
          {release.isSuccess ? (
            <p className="text-sm text-emerald-600">
              Released {release.data.releasedSmallestUnit} (cumulative{' '}
              {release.data.cumulativeReleasedSmallestUnit}). Deal is now {release.data.toState}.
            </p>
          ) : null}
          <ConfirmMoneyDialog
            isOpen={showConfirm}
            onClose={() => setShowConfirm(false)}
            onConfirm={() => {
              setShowConfirm(false);
              release.mutate();
            }}
            title="Release Milestone Escrow"
            description="You are about to release this milestone's funds from escrow directly to the seller. This action is irreversible."
            amountText={`Milestone ID: ${milestoneId}`}
            isSubmitting={release.isPending}
          />
          <Button
            disabled={!milestoneValid || release.isPending}
            onClick={() => setShowConfirm(true)}
          >
            {release.isPending ? 'Releasing…' : 'Release milestone'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
