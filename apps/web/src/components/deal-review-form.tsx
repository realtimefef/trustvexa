'use client';

/**
 * Review submission form shown on the deal-detail page (task 7.6). It renders
 * only for the buyer or seller of a deal that has reached a terminal
 * settlement state; the server re-checks all eligibility, so this gate is just
 * UX. A successful submit swaps the form for a thank-you, and an
 * `already_reviewed` conflict is surfaced gracefully.
 */
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import type { DealRole } from '@/lib/api/types';

const REVIEWABLE_STATUSES = new Set(['Released', 'Refunded', 'PartiallySettled']);

interface ReviewSubmissionResponse {
  id: string;
  dealId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export function DealReviewForm({
  dealId,
  status,
  role,
}: {
  dealId: string;
  status: string;
  role: DealRole;
}) {
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest<ReviewSubmissionResponse>(`/reviews/deals/${dealId}`, {
        method: 'POST',
        body: { rating, comment: comment.trim() || null },
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
  });

  if (!REVIEWABLE_STATUSES.has(status) || role === 'middleman') {
    return null;
  }

  if (mutation.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review submitted</CardTitle>
          <CardDescription>Thanks for rating your counterparty.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const alreadyReviewed =
    mutation.error instanceof ApiError && mutation.error.code === 'already_reviewed';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate your counterparty</CardTitle>
        <CardDescription>
          Your rating helps other traders decide who to deal with. You can review each completed
          deal once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alreadyReviewed ? (
          <p className="text-sm text-muted-foreground">You have already reviewed this deal.</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={value <= rating ? 'default' : 'outline'}
                    onClick={() => setRating(value)}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comment">Comment (optional)</Label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Share how the deal went."
              />
            </div>
            {mutation.isError && !alreadyReviewed ? (
              <p className="text-sm text-destructive">
                Could not submit your review. Please try again.
              </p>
            ) : null}
            <Button
              type="button"
              disabled={rating === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Submitting\u2026' : 'Submit review'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
