'use client';

/**
 * Middleman enforcement panel (task 7.3). Lets the assigned middleman block /
 * unblock a user, set their trust/limit label, or lower their trust level by a
 * user id. Every action requires a reason and is audited server-side
 * (hash-chained `admin_actions`); this UI only collects the input. Money/state
 * safety and authorization are enforced by the API.
 */
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { AccountLabel, EnforcementResult } from '@/lib/api/types';

type Action = 'block' | 'unblock' | 'label' | 'trust-downgrade';

const LABELS: AccountLabel[] = [
  'new_user',
  'good_standing',
  'trusted',
  'high_risk',
  'middleman_verified',
];

export function EnforcementPanel() {
  const [action, setAction] = React.useState<Action>('block');
  const [userId, setUserId] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [label, setLabel] = React.useState<AccountLabel>('good_standing');
  const [amount, setAmount] = React.useState('1');

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { reason: reason.trim() };
      if (action === 'label') body.label = label;
      if (action === 'trust-downgrade') body.amount = Number(amount);
      return apiRequest<EnforcementResult>(`/admin/users/${userId.trim()}/${action}`, {
        method: 'POST',
        body,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    retry: false,
  });

  const userValid = /^[0-9a-f-]{8,}$/i.test(userId.trim());
  const reasonValid = reason.trim().length > 0;
  const amountValid = action !== 'trust-downgrade' || Number(amount) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enforcement</CardTitle>
        <CardDescription>
          Block, restrict, or downgrade a user. Each action is audited and requires a reason.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="enf-action">Action</Label>
            <select
              id="enf-action"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={action}
              onChange={(e) => setAction(e.target.value as Action)}
            >
              <option value="block">Block user</option>
              <option value="unblock">Unblock user</option>
              <option value="label">Set account label</option>
              <option value="trust-downgrade">Lower trust level</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enf-user">User ID</Label>
            <Input
              id="enf-user"
              placeholder="UUID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
        </div>

        {action === 'label' ? (
          <div className="space-y-2">
            <Label htmlFor="enf-label">Account label</Label>
            <select
              id="enf-label"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={label}
              onChange={(e) => setLabel(e.target.value as AccountLabel)}
            >
              {LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {action === 'trust-downgrade' ? (
          <div className="space-y-2">
            <Label htmlFor="enf-amount">Downgrade amount</Label>
            <Input
              id="enf-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="enf-reason">Reason</Label>
          <textarea
            id="enf-reason"
            className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {mutation.isError ? (
          <p className="text-sm text-destructive">
            {mutation.error instanceof ApiError ? mutation.error.message : 'Action failed.'}
          </p>
        ) : null}
        {mutation.isSuccess ? (
          <p className="text-sm text-emerald-600">
            Done: {mutation.data.action} (audit {mutation.data.auditId.slice(0, 8)}).
          </p>
        ) : null}

        <Button
          onClick={() => mutation.mutate()}
          disabled={!userValid || !reasonValid || !amountValid || mutation.isPending}
          variant={action === 'block' ? 'destructive' : 'default'}
        >
          {mutation.isPending ? 'Applying…' : 'Apply action'}
        </Button>
      </CardContent>
    </Card>
  );
}
