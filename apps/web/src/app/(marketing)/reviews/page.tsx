'use client';

/**
 * Public reviews board.
 *
 *  - Anyone can read visible reviews + the aggregate rating.
 *  - Any signed-in user can post a review.
 *  - The middleman sees moderation controls on each review: reply, hide/unhide,
 *    edit, and delete. Every moderation action is audited server-side.
 */
import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2, EyeOff, Eye, Pencil, Reply } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewStars } from '@/components/ui/review-stars';
import { ApiError, apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface PublicReview {
  id: string;
  authorId: string;
  authorUsername: string | null;
  rating: number;
  title: string | null;
  body: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string | null;
  hidden?: boolean;
  deletedAt?: string | null;
}

interface PublicReviewsResult {
  reviews: PublicReview[];
  count: number;
  averageRating: number;
}

function date(value: string | null): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString();
}

export default function PublicReviewsPage() {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const isMiddleman = user?.role === 'middleman' || user?.account_type === 'middleman';

  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [posted, setPosted] = React.useState(false);

  // Middleman sees the full moderation list (incl. hidden/deleted); everyone
  // else sees the public visible list.
  const reviewsQuery = useQuery({
    queryKey: ['public-reviews', isMiddleman],
    queryFn: async (): Promise<PublicReviewsResult> => {
      if (isMiddleman) {
        const res = await apiRequest<{ reviews: PublicReview[] }>('/reviews/public/moderation');
        const visible = res.reviews.filter((r) => !r.hidden && !r.deletedAt);
        const sum = visible.reduce((a, r) => a + r.rating, 0);
        return {
          reviews: res.reviews,
          count: visible.length,
          averageRating: visible.length ? Math.round((sum / visible.length) * 100) / 100 : 0,
        };
      }
      return apiRequest<PublicReviewsResult>('/reviews/public');
    },
  });

  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['public-reviews'] });

  const submit = useMutation({
    mutationFn: async () =>
      apiRequest<PublicReview>('/reviews/public', {
        method: 'POST',
        body: { rating, title: title.trim() || null, body: body.trim() },
      }),
    retry: false,
    onSuccess: () => {
      setPosted(true);
      setTitle('');
      setBody('');
      setRating(5);
      invalidate();
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Unable to submit your review.');
    },
  });

  const reply = useMutation({
    mutationFn: async (args: { reviewId: string; reply: string | null }) =>
      apiRequest(`/reviews/public/${args.reviewId}/reply`, {
        method: 'POST',
        body: { reply: args.reply },
      }),
    retry: false,
    onSuccess: invalidate,
  });

  const setHidden = useMutation({
    mutationFn: async (args: { reviewId: string; hidden: boolean; reason: string }) =>
      apiRequest(`/reviews/public/${args.reviewId}/visibility`, {
        method: 'POST',
        body: { hidden: args.hidden, reason: args.reason },
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (args: { reviewId: string; reason: string }) =>
      apiRequest(`/reviews/public/${args.reviewId}`, {
        method: 'DELETE',
        body: { reason: args.reason },
      }),
    retry: false,
    onSuccess: invalidate,
  });

  const edit = useMutation({
    mutationFn: async (args: {
      reviewId: string;
      rating: number;
      title: string | null;
      body: string;
      reason: string;
    }) =>
      apiRequest(`/reviews/public/${args.reviewId}`, {
        method: 'PATCH',
        body: {
          rating: args.rating,
          title: args.title,
          body: args.body,
          reason: args.reason,
        },
      }),
    retry: false,
    onSuccess: invalidate,
  });

  const onReply = (r: PublicReview) => {
    const text = window.prompt('Public reply to this review (leave blank to clear):', r.reply ?? '');
    if (text === null) return;
    reply.mutate({ reviewId: r.id, reply: text.trim() || null });
  };
  const onHide = (r: PublicReview) => {
    const reason = window.prompt(r.hidden ? 'Reason to unhide:' : 'Reason to hide this review:');
    if (reason && reason.trim()) setHidden.mutate({ reviewId: r.id, hidden: !r.hidden, reason: reason.trim() });
  };
  const onDelete = (r: PublicReview) => {
    const reason = window.prompt('Reason to delete this review:');
    if (reason && reason.trim()) remove.mutate({ reviewId: r.id, reason: reason.trim() });
  };
  const onEdit = (r: PublicReview) => {
    const nextBody = window.prompt('Edit review text:', r.body);
    if (nextBody === null) return;
    const reason = window.prompt('Reason for editing:');
    if (!reason || !reason.trim()) return;
    edit.mutate({
      reviewId: r.id,
      rating: r.rating,
      title: r.title,
      body: nextBody.trim() || r.body,
      reason: reason.trim(),
    });
  };

  const moderating =
    reply.isPending || setHidden.isPending || remove.isPending || edit.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Community Reviews</h1>
        <p className="mt-2 text-muted-foreground">
          What people say about trading on TrustVexa.
        </p>
      </div>

      {/* Aggregate */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="flex items-center gap-4 py-6">
          {reviewsQuery.isLoading ? (
            <Skeleton className="h-12 w-40" />
          ) : (
            <>
              <span className="font-display text-4xl font-bold">
                {(reviewsQuery.data?.averageRating ?? 0).toFixed(2)}
              </span>
              <div>
                <ReviewStars rating={Math.round(reviewsQuery.data?.averageRating ?? 0)} />
                <p className="text-xs text-muted-foreground">
                  {reviewsQuery.data?.count ?? 0} review
                  {(reviewsQuery.data?.count ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Submit form (signed-in users) */}
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Write a review
          </CardTitle>
          <CardDescription>Share your experience with the community.</CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'authenticated' ? (
            <p className="text-sm text-muted-foreground">
              Please{' '}
              <a href="/login?next=/reviews" className="font-medium underline underline-offset-4">
                log in
              </a>{' '}
              to write a review.
            </p>
          ) : posted ? (
            <Alert>
              <AlertTitle>Thanks for your review!</AlertTitle>
              <AlertDescription>
                It&apos;s now live on the board.{' '}
                <button className="underline" onClick={() => setPosted(false)}>
                  Write another
                </button>
              </AlertDescription>
            </Alert>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                if (body.trim().length === 0) {
                  setFormError('Please write a few words.');
                  return;
                }
                submit.mutate();
              }}
            >
              {formError ? (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-1.5">
                <Label>Your rating</Label>
                <ReviewStars rating={rating} onRatingChange={setRating} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title (optional)</Label>
                <Input
                  id="title"
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summarise your experience"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Your review</Label>
                <textarea
                  id="body"
                  value={body}
                  maxLength={2000}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border bg-background p-3 text-sm"
                  placeholder="Tell others about your experience…"
                />
              </div>
              <Button type="submit" variant="gradient" disabled={submit.isPending}>
                {submit.isPending ? 'Posting…' : 'Post review'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {reviewsQuery.isLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : reviewsQuery.isError ? (
          <p className="text-sm text-destructive">Unable to load reviews.</p>
        ) : (reviewsQuery.data?.reviews.length ?? 0) === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          reviewsQuery.data!.reviews.map((r) => (
            <Card
              key={r.id}
              className={`rounded-2xl shadow-soft ${r.deletedAt ? 'opacity-50' : ''}`}
            >
              <CardContent className="space-y-2 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ReviewStars rating={r.rating} />
                    <span className="text-sm font-medium">{r.authorUsername ?? 'User'}</span>
                    {r.hidden ? (
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">Hidden</span>
                    ) : null}
                    {r.deletedAt ? (
                      <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                        Deleted
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>
                </div>
                {r.title ? <p className="font-medium">{r.title}</p> : null}
                <p className="text-sm text-muted-foreground">{r.body}</p>

                {r.reply ? (
                  <div className="mt-2 rounded-lg border-l-2 border-primary bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-primary">TrustVexa replied</p>
                    <p className="text-sm text-muted-foreground">{r.reply}</p>
                  </div>
                ) : null}

                {isMiddleman ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" disabled={moderating} onClick={() => onReply(r)}>
                      <Reply className="h-4 w-4" /> Reply
                    </Button>
                    <Button variant="outline" size="sm" disabled={moderating} onClick={() => onEdit(r)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" disabled={moderating} onClick={() => onHide(r)}>
                      {r.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {r.hidden ? 'Unhide' : 'Hide'}
                    </Button>
                    {!r.deletedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={moderating}
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
