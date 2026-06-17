'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  MessageSquare,
  Star,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface ModerationReview {
  id: string;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}

interface ReviewModerationResponse {
  revieweeId: string;
  reviews: ModerationReview[];
}

export default function ReviewModerationPage() {
  const router = useRouter();
  const { status } = useAuth();
  const queryClient = useQueryClient();

  const [searchUserId, setSearchUserId] = React.useState('');
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);

  // Moderation state
  const [selectedReview, setSelectedReview] = React.useState<ModerationReview | null>(null);
  const [modReason, setModReason] = React.useState('');
  const [modAction, setModAction] = React.useState<boolean>(true); // true = hide, false = unhide
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/admin/reviews');
    }
  }, [status, router]);

  // Fetch reviews for active user
  const reviewsQuery = useQuery({
    queryKey: ['admin-reviews', activeUserId],
    enabled: status === 'authenticated' && !!activeUserId,
    queryFn: async () => {
      const res = await apiRequest<ReviewModerationResponse>(`/reviews/moderation/users/${activeUserId}`);
      return res.reviews;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUserId.trim()) return;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(searchUserId.trim())) {
      alert('Please enter a valid User UUID.');
      return;
    }

    setActiveUserId(searchUserId.trim());
  };

  const handleOpenModeration = (review: ModerationReview, hide: boolean) => {
    setSelectedReview(review);
    setModAction(hide);
    setModReason('');
  };

  const handleModerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview || !modReason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const key = `mod-review-${selectedReview.id}-${Date.now()}`;

    try {
      await apiRequest(`/reviews/moderation/${selectedReview.id}`, {
        method: 'POST',
        idempotencyKey: key,
        body: {
          hidden: modAction,
          reason: modReason,
        },
      });

      setSelectedReview(null);
      setModReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews', activeUserId] });
    } catch (err) {
      console.error('Failed to moderate review:', err);
      alert('Failed to update review visibility. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const reviews = reviewsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Console
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-primary" /> Review Moderation
        </h1>
        <p className="text-sm text-muted-foreground">
          View all reviews written about a user and manage their public visibility.
        </p>
      </header>

      {/* User Search Card */}
      <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Lookup User Reviews</CardTitle>
          <CardDescription>Search by User UUID to view both visible and hidden feedback.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter User UUID (e.g., d3b07384d-..."
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" className="font-semibold text-xs">
              Search Reviews
            </Button>
          </form>
        </CardContent>
      </Card>

      {activeUserId && (
        <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Reviews list for user
            </CardTitle>
            <CardDescription className="font-mono text-xs truncate">
              User ID: {activeUserId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {reviewsQuery.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : reviewsQuery.isError ? (
              <div className="text-center py-6 space-y-2">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm font-semibold">Failed to load reviews</p>
                <p className="text-xs text-muted-foreground">Make sure the user exists and you have permissions.</p>
              </div>
            ) : reviews.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No reviews written about this user yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`p-4 border rounded-xl flex flex-col sm:flex-row justify-between gap-4 transition-all ${
                      review.hidden ? 'bg-destructive/[0.02] border-destructive/20' : 'bg-card'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Rating stars */}
                        <div className="flex items-center text-yellow-500 gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4.5 w-4.5 ${
                                i < review.rating ? 'fill-current' : 'text-muted/40'
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant={review.hidden ? 'destructive' : 'success'} className="text-[10px]">
                          {review.hidden ? 'Hidden' : 'Visible'}
                        </Badge>
                      </div>

                      {review.comment ? (
                        <p className="text-sm leading-relaxed text-foreground select-text font-serif italic">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No written comment.</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground font-mono">
                        <span>Deal ID: {review.dealId.slice(0, 8)}...</span>
                        <span>Reviewer: {review.reviewerId.slice(0, 8)}...</span>
                        <span>Date: {new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-start gap-2">
                      {review.hidden ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs text-success border-success/30 hover:bg-success/10 hover:text-success"
                          onClick={() => handleOpenModeration(review, false)}
                        >
                          <Eye className="h-3.5 w-3.5" /> Restore
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleOpenModeration(review, true)}
                        >
                          <EyeOff className="h-3.5 w-3.5" /> Moderate / Hide
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Moderation Modal / Form dialog */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-glow animate-fadeIn">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-base flex items-center gap-2">
                {modAction ? <EyeOff className="h-5 w-5 text-destructive" /> : <Eye className="h-5 w-5 text-success" />}
                {modAction ? 'Hide Review' : 'Restore Review'}
              </CardTitle>
              <CardDescription>
                Provide the operational reason for updating this review&apos;s visibility.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleModerateSubmit} className="space-y-4">
              <div className="bg-muted/30 p-3 rounded-lg border text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-semibold text-foreground">Review Comment:</span>{' '}
                  {selectedReview.comment ? `"${selectedReview.comment}"` : '(No comment)'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Rating:</span> {selectedReview.rating} / 5
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Moderation justification
                </label>
                <Textarea
                  placeholder="Explain the reasoning (e.g. offensive language, privacy violation, incorrect deal rating)..."
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="text-xs min-h-[100px]"
                  required
                />
                <p className="text-[10px] text-muted-foreground leading-normal">
                  All moderation events are securely hash-chained and logged to the compliance ledger.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedReview(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant={modAction ? 'destructive' : 'gradient'} size="sm" disabled={isSubmitting || !modReason.trim()}>
                  {isSubmitting ? 'Saving...' : modAction ? 'Confirm Hide' : 'Confirm Restore'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
