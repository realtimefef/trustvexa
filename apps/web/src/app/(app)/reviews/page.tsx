'use client';

/**
 * Reviews & ratings (Plan §9, §12). Three things on one page:
 *   1. Your reputation — the public reviews left about you + your trust status.
 *   2. Look up a user — view any user's public ratings (reviews are public,
 *      reviewer identity is never exposed beyond the deal context).
 *   3. Moderation (middleman only) — list every review about a user including
 *      hidden ones, and hide/unhide abusive content (audited, reason required).
 */
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Eye, ShieldCheck, Star, Search, Gavel, PenLine, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  DashboardResponse,
  ModerateReviewResponse,
  ModerationReview,
  ReviewModerationResponse,
  TrustStatusResponse,
  UserReviewsResponse,
} from '@/lib/api/types';


// ── Write a review inline form ──────────────────────────────────────────────
function WriteReviewCard({ dealId, counterpartyLabel, onDone }: {
  dealId: string;
  counterpartyLabel: string;
  onDone: () => void;
}) {
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (!rating) { setError('Please select a star rating first.'); return; }
    setSubmitting(true); setError(null);
    try {
      await apiRequest('/reviews', {
        method: 'POST',
        body: { dealId, rating, comment: comment.trim() || undefined },
        idempotencyKey: newIdempotencyKey(),
      });
      setDone(true);
      setTimeout(onDone, 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <p className="text-sm text-emerald-600 font-medium">Review submitted! Thank you.</p>
      </div>
    );
  }

  return (
    <Card className="rounded-2xl border-primary/30 shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <PenLine className="h-4 w-4 text-primary" /> Write a review
        </CardTitle>
        <CardDescription>{counterpartyLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Your rating <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} type="button"
                className="transition-transform hover:scale-110 focus:outline-none"
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
                aria-label={`${n} star`}>
                <Star className={`h-7 w-7 transition-colors ${n <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{['','Terrible','Poor','Okay','Good','Excellent'][rating]}</span>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc" className="text-sm font-medium">Comment <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <textarea id="rc" rows={3} value={comment} onChange={e => setComment(e.target.value)}
            className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Describe your experience trading with this person…" maxLength={500} />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/500</p>
        </div>
        {error && <p className="text-xs text-destructive">⚠ {error}</p>}
        <Button onClick={submit} disabled={submitting || !rating} className="w-full">
          {submitting ? 'Submitting…' : 'Submit review'}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Reviews are public and permanent. Your identity is kept private.
        </p>
      </CardContent>
    </Card>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={
            n <= rating
              ? 'h-4 w-4 fill-amber-400 text-amber-400'
              : 'h-4 w-4 text-muted-foreground/40'
          }
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function date(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString();
}

export default function ReviewsPage() {
  const router = useRouter();
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const isMiddleman = user?.role === 'middleman';

  const [lookupId, setLookupId] = React.useState('');
  const [expandedWriteId, setExpandedWriteId] = React.useState<string | null>(null);

  const completedDeals = useQuery({
    queryKey: ['completed-deals-for-review'],
    enabled: status === 'authenticated',
    queryFn: async () => {
      const res = await apiRequest<DashboardResponse>('/dashboard');
      return res.deals.filter((d: DashboardResponse['deals'][number]) =>
        ['Released', 'PartiallySettled'].includes(d.status)
      );
    },
  });
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (status === 'anonymous') router.replace('/login?next=/reviews');
  }, [status, router]);

  const myReviews = useQuery({
    queryKey: ['my-reviews', user?.id],
    enabled: status === 'authenticated' && typeof user?.id === 'string',
    queryFn: async () => apiRequest<UserReviewsResponse>(`/reviews/users/${user!.id}`),
  });

  const myTrust = useQuery({
    queryKey: ['my-trust'],
    enabled: status === 'authenticated',
    queryFn: async () => apiRequest<TrustStatusResponse>('/reviews/me/trust'),
  });

  // Lookup: middleman gets the moderation view (incl. hidden); others get the
  // public view. We normalise both into the same shape for rendering.
  const lookup = useQuery({
    queryKey: ['review-lookup', activeId, isMiddleman],
    enabled: activeId !== null,
    queryFn: async (): Promise<ModerationReview[]> => {
      if (isMiddleman) {
        const res = await apiRequest<ReviewModerationResponse>(
          `/reviews/moderation/users/${activeId}`,
        );
        return res.reviews;
      }
      const res = await apiRequest<UserReviewsResponse>(`/reviews/users/${activeId}`);
      return res.reviews.map((r) => ({
        id: r.id,
        dealId: r.dealId,
        reviewerId: '',
        revieweeId: activeId!,
        rating: r.rating,
        comment: r.comment,
        hidden: false,
        createdAt: r.createdAt,
      }));
    },
  });

  const moderate = useMutation({
    mutationFn: async (args: { reviewId: string; hidden: boolean; reason: string }) =>
      apiRequest<ModerateReviewResponse>(`/reviews/moderation/${args.reviewId}`, {
        method: 'POST',
        body: { hidden: args.hidden, reason: args.reason },
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review-lookup', activeId, isMiddleman] });
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    },
  });

  const onModerate = (reviewId: string, hidden: boolean) => {
    const reason = window.prompt(
      hidden ? 'Reason for hiding this review:' : 'Reason for restoring this review:',
    );
    if (reason && reason.trim().length > 0) {
      moderate.mutate({ reviewId, hidden, reason: reason.trim() });
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        title="Reviews & ratings"
        description="Your reputation is built from real, completed deals. Reviews are public; only your username is ever shown."
      />

      {/* ── WRITE A REVIEW ─────────────────────────────────────────── */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenLine className="h-4 w-4 text-primary" aria-hidden="true" /> Write a review for a completed deal
          </CardTitle>
          <CardDescription>
            Rate your counterparty after any settled deal. Both buyer and seller can review each other.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedDeals.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (completedDeals.data?.length ?? 0) === 0 ? (
            <div className="rounded-xl bg-muted/40 border border-dashed px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">No completed deals to review yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Once a deal settles you can leave a rating here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedDeals.data!.map((deal: DashboardResponse['deals'][number]) => (
                <div key={deal.id} className="space-y-2">
                  <button type="button"
                    onClick={() => setExpandedWriteId(expandedWriteId === deal.id ? null : deal.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 hover:bg-muted/40 transition-colors ${expandedWriteId === deal.id ? 'border-primary bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Deal <span className="font-mono">{deal.id.slice(0,8)}</span></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{deal.coin} · {deal.network} · {deal.status} · As {deal.role}</p>
                      </div>
                      <span className="text-xs font-medium text-primary shrink-0">
                        {expandedWriteId === deal.id ? 'Cancel' : '+ Write review'}
                      </span>
                    </div>
                  </button>
                  {expandedWriteId === deal.id && (
                    <WriteReviewCard
                      dealId={deal.id}
                      counterpartyLabel={`Your role: ${deal.role} · ${deal.coin} deal settled`}
                      onDone={() => {
                        setExpandedWriteId(null);
                        void queryClient.invalidateQueries({ queryKey: ['my-reviews', user?.id] });
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your reputation */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-amber-400" aria-hidden="true" /> Your reputation
          </CardTitle>
          <CardDescription>Ratings other traders left about you.</CardDescription>
        </CardHeader>
        <CardContent>
          {myReviews.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : myReviews.isError ? (
            <p className="text-sm text-destructive">Unable to load your reviews.</p>
          ) : (myReviews.data?.count ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet. Complete a deal to start building your reputation.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold">
                  {myReviews.data!.averageRating.toFixed(2)}
                </span>
                <div>
                  <Stars rating={Math.round(myReviews.data!.averageRating)} />
                  <p className="text-xs text-muted-foreground">
                    {myReviews.data!.count} review{myReviews.data!.count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <ul className="divide-y">
                {myReviews.data!.reviews.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>
                    </div>
                    {r.comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trust status */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /> Trust status
          </CardTitle>
          <CardDescription>How your standing affects what you can do.</CardDescription>
        </CardHeader>
        <CardContent>
          {myTrust.isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : myTrust.isError ? (
            <p className="text-sm text-destructive">Unable to load your trust status.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant={myTrust.data!.restriction.blockNewDeals ? 'destructive' : 'success'}>
                {myTrust.data!.restriction.kind.replace(/_/g, ' ')}
              </Badge>
              <span className="text-muted-foreground">
                Missed deadlines: {myTrust.data!.missedDeadlineCount}
              </span>
              {myTrust.data!.restriction.maxActiveDeals !== null ? (
                <span className="text-muted-foreground">
                  Max active deals: {myTrust.data!.restriction.maxActiveDeals}
                </span>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lookup + moderation */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isMiddleman ? (
              <Gavel className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            {isMiddleman ? 'Review moderation' : "Look up a user's reviews"}
          </CardTitle>
          <CardDescription>
            {isMiddleman
              ? 'View every review about a user (including hidden ones) and hide or restore abusive content. Every action is logged.'
              : "Reviews are public. Enter a user ID to see that trader's ratings."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="lookup">User ID</Label>
              <Input
                id="lookup"
                placeholder="user UUID"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setActiveId(lookupId.trim() || null)}>
              View
            </Button>
          </div>

          {activeId !== null ? (
            lookup.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : lookup.isError ? (
              <p className="text-sm text-destructive">
                {lookup.error instanceof ApiError
                  ? lookup.error.message
                  : 'Unable to load reviews.'}
              </p>
            ) : (lookup.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews found for this user.</p>
            ) : (
              <ul className="divide-y">
                {lookup.data!.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />
                        {r.hidden ? <Badge variant="secondary">Hidden</Badge> : null}
                      </div>
                      {r.comment ? (
                        <p className="text-sm text-muted-foreground">{r.comment}</p>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">No comment</p>
                      )}
                      <p className="text-xs text-muted-foreground">{date(r.createdAt)}</p>
                    </div>
                    {isMiddleman ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={moderate.isPending}
                        onClick={() => onModerate(r.id, !r.hidden)}
                      >
                        {r.hidden ? (
                          <>
                            <Eye className="h-4 w-4" /> Restore
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" /> Hide
                          </>
                        )}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
