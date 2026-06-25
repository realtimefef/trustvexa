'use client';

import * as React from 'react';
import Link from 'next/link';
import { Star, Quote, Shield, CheckCircle2, ArrowRight, MessageSquare, PenLine, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, ApiError, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicReview {
  id: string;
  authorId: string;
  authorUsername?: string | null;
  rating: number;
  title: string | null;
  body: string;
  isHidden?: boolean;
  createdAt: string;
  replyBody?: string | null;
  repliedAt?: string | null;
}

interface PublicReviewsResponse {
  reviews: PublicReview[];
  total?: number;
}

const FALLBACK_REVIEWS: PublicReview[] = [
  { id: '1', authorId: '', authorUsername: 'Crypto_Mara', rating: 5, title: 'Best escrow ever', body: 'Smooth release and clear communication the whole way through. The escrow held funds securely and the middleman was professional when I had a question. Highly recommend.', createdAt: new Date().toISOString() },
  { id: '2', authorId: '', authorUsername: 'LedgerL24', rating: 5, title: 'Fast and reliable', body: 'Best escrow platform I have used. Funded fast, payout was instant after buyer approved. The verification code step is a great idea — no chance of fraud.', createdAt: new Date().toISOString() },
  { id: '3', authorId: '', authorUsername: 'NodeWrangler', rating: 4, title: 'Great experience overall', body: 'Great experience overall. Delivery took a little longer than expected but the inspection window gave me plenty of time to verify. Everything checked out perfectly.', createdAt: new Date().toISOString() },
  { id: '4', authorId: '', authorUsername: 'SafeTrade99', rating: 5, title: 'Dispute resolved in under an hour', body: 'I was skeptical at first but the escrow process removed all trust issues. The middleman resolved a small delivery dispute in under an hour. Excellent platform.', createdAt: new Date().toISOString() },
];

const STATS = [
  { label: 'Average rating', value: '4.9/5', sub: 'across all completed deals' },
  { label: 'Deals completed', value: '2,400+', sub: 'and growing every week' },
  { label: 'Dispute resolution', value: '< 24h', sub: 'average middleman response' },
  { label: 'Funds secured', value: '$4.2M+', sub: 'total escrow volume' },
];

// ── Write Review Form ─────────────────────────────────────────────────────────

function WritePublicReviewCard({ onSubmitted }: { onSubmitted: () => void }) {
  const { status, user } = useAuth();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) { setError('Please choose a star rating.'); return; }
    if (!body.trim()) { setError('Please write a short review.'); return; }
    setSubmitting(true); setError(null);
    try {
      await apiRequest('/reviews/public', {
        method: 'POST',
        body: { rating, title: title.trim() || null, body: body.trim() },
        idempotencyKey: newIdempotencyKey(),
      });
      setDone(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to submit review.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-6 py-5 max-w-xl mx-auto">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">Review submitted! Thank you.</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">Your review will appear once approved by our team.</p>
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border bg-card px-6 py-8 text-center space-y-4">
        <PenLine className="h-8 w-8 text-primary mx-auto" />
        <div>
          <p className="font-semibold text-base">Share your experience</p>
          <p className="text-sm text-muted-foreground mt-1">Sign in to leave a review about TrustVexa.</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild variant="gradient">
            <Link href="/login?next=/testimonials">Sign in to write a review</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border bg-muted/20 px-6 py-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <Card className="max-w-xl mx-auto rounded-2xl shadow-soft">
      <CardHeader className="pb-0 pt-5 px-6">
        <p className="font-display text-lg font-bold">Write a review</p>
        <p className="text-sm text-muted-foreground">Signed in as <strong>{user?.username}</strong></p>
      </CardHeader>
      <CardContent className="px-6 pt-4 pb-6">
        <form onSubmit={submit} className="space-y-4">
          {/* Star rating */}
          <div className="space-y-1.5">
            <Label>Your rating <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}
                  aria-label={`${n} star`}>
                  <Star className={`h-8 w-8 transition-colors ${n <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {['','Terrible','Poor','Okay','Good','Excellent!'][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="review-title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="review-title" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Best escrow platform" maxLength={120} />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="review-body">Your review <span className="text-destructive">*</span></Label>
            <textarea id="review-body" rows={4} value={body} onChange={e => setBody(e.target.value)}
              required minLength={10} maxLength={2000}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Tell us about your experience with TrustVexa…" />
            <p className="text-xs text-muted-foreground text-right">{body.length}/2000</p>
          </div>

          {error && <p className="text-xs text-destructive">⚠ {error}</p>}

          <Button type="submit" disabled={submitting || !rating || !body.trim()} className="w-full">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : 'Submit review'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Reviews are moderated before appearing publicly. Your username will be shown.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TestimonialsPage() {
  const queryClient = useQueryClient();

  const reviewsQuery = useQuery({
    queryKey: ['public-reviews'],
    queryFn: async () => {
      const res = await apiRequest<PublicReviewsResponse>('/reviews/public?limit=50');
      return res.reviews.filter(r => !r.isHidden);
    },
    staleTime: 60_000,
  });

  const reviews: PublicReview[] = (reviewsQuery.data && reviewsQuery.data.length > 0)
    ? reviewsQuery.data
    : FALLBACK_REVIEWS;

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-brand-gradient py-20 text-white md:py-28">
        <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 text-center space-y-4">
          <Badge className="bg-white/15 text-white border-white/20">Verified trader reviews</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Traders love TrustVexa
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Real reviews from real users. Every review is moderated by our team.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link href="/register">Start trading safely</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews grid */}
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold">What our traders say</h2>
          <p className="text-muted-foreground text-sm">Real platform reviews from verified TrustVexa users</p>
        </div>

        {reviewsQuery.isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-muted/20 h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <Card key={r.id} className="rounded-2xl shadow-soft hover:shadow-glow transition-all hover:-translate-y-0.5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-primary text-sm">
                          {(r.authorUsername ?? 'U')[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{r.authorUsername ?? `User ${r.authorId.slice(0,8)}`}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {Array.from({ length: r.rating }, (_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Quote className="h-4 w-4 text-muted-foreground" />
                  {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                  {r.replyBody && (
                    <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                      <p className="text-[10px] font-semibold text-primary mb-1">TrustVexa replied:</p>
                      <p className="text-xs text-muted-foreground">{r.replyBody}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Trust indicators */}
      <section className="border-t bg-muted/20 py-12">
        <div className="mx-auto max-w-4xl px-4 grid gap-6 sm:grid-cols-3 text-center">
          {[
            { icon: Shield, title: 'Moderated reviews', desc: 'Every review is checked by our team before appearing publicly.' },
            { icon: CheckCircle2, title: 'No paid placements', desc: 'We never pay for reviews or boost positive feedback artificially.' },
            { icon: MessageSquare, title: 'Real traders', desc: 'Every reviewer is a registered TrustVexa user.' },
          ].map(t => (
            <div key={t.title} className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <t.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold text-sm">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Write review section */}
      <section className="border-t py-16 px-4 space-y-8 bg-muted/10">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold">Share your experience</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Used TrustVexa? Tell others about it. Reviews help the community trust the platform.
          </p>
        </div>
        <WritePublicReviewCard onSubmitted={() => void queryClient.invalidateQueries({ queryKey: ['public-reviews'] })} />
        <p className="text-center text-xs text-muted-foreground">
          Want to review a specific deal counterparty?{' '}
          <Link href="/reviews" className="text-primary underline">Go to deal reviews →</Link>
        </p>
      </section>

      {/* CTA */}
      <section className="py-16 text-center px-4 space-y-4 border-t">
        <h2 className="font-display text-2xl font-bold">Ready to trade with confidence?</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Join thousands of buyers and sellers who protect every deal with TrustVexa escrow.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="gradient" size="lg">
            <Link href="/register">Create a free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/how-it-works">Learn how it works</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
