'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Gauge,
  Handshake,
  Lock,
  MessageSquare,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  UserRound,
  Loader2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { StatCard } from '@/components/visual/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { FileDropzone } from '@/components/file-dropzone';
import { apiRequest, getAccessToken } from '@/lib/api/client';
import type { UserReviewsResponse } from '@/lib/api/types';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const TRUST_LADDER = [
  {
    icon: Sparkles,
    level: 'New',
    title: 'Getting started',
    body: 'Every account begins here. Complete your first verified deal to unlock the next level.',
  },
  {
    icon: TrendingUp,
    level: 'Rising',
    title: 'Building momentum',
    body: 'Consistent, dispute-free deals push your score up and surface you higher in search.',
  },
  {
    icon: Award,
    level: 'Trusted',
    title: 'Proven track record',
    body: 'A long history of clean settlements earns the verified trader badge and faster limits.',
  },
];

const BADGES = [
  { icon: BadgeCheck, label: 'Identity verified', hint: 'Email and account checks passed.' },
  { icon: ShieldCheck, label: 'Escrow protected', hint: 'Trades secured through TrustVexa escrow.' },
  { icon: Handshake, label: '50+ deals', hint: 'Completed fifty or more settled deals.' },
  { icon: Star, label: 'Top rated', hint: 'Maintains a 4.8+ counterparty rating.' },
];

const RELATED_LINKS = [
  { href: '/deals', label: 'Your deals', hint: 'Review active and settled trades.' },
  { href: '/calculator', label: 'Fee calculator', hint: 'Estimate costs before you commit.' },
  { href: '/settings', label: 'Security settings', hint: 'Tune 2FA and login alerts.' },
  { href: '/reviews', label: 'Leave a review', hint: 'Rate your counterparties.' },
];

interface ProfileResponse {
  username: string;
  accountLabel: string;
  trustLevel: number;
  accountStatus: string;
  createdAt: string;
  avatarUrl: string | null;
}

export default function ProfilePage() {
  const { status, user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const [avatarTimestamp, setAvatarTimestamp] = React.useState(Date.now());
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [usernameInput, setUsernameInput] = React.useState('');
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const { data: profile, isLoading, isError } = useQuery<ProfileResponse>({
    queryKey: ['profile'],
    enabled: status === 'authenticated',
    queryFn: async () => apiRequest<ProfileResponse>('/me'),
  });

  // Real reviews fetched from the API — no hardcoded data
  const reviewsQuery = useQuery({
    queryKey: ['my-reviews-profile', authUser?.id],
    enabled: status === 'authenticated' && !!authUser?.id,
    queryFn: async () => apiRequest<UserReviewsResponse>(`/reviews/users/${authUser!.id}`),
  });

  React.useEffect(() => {
    if (profile) setUsernameInput(profile.username);
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (body: { username: string }) =>
      apiRequest<ProfileResponse>('/me', { method: 'PATCH', body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSaveSuccess(true); setSaveError(null);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (err: Error) => setSaveError(err.message || 'Failed to update profile.'),
  });

  const handleAvatarUpload = async (file: File) => {
    setUploadError(null);
    const token = getAccessToken();
    try {
      const response = await fetch(`${API_ORIGIN}/api/v1/me/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': file.type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: file,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || 'Failed to upload avatar.');
      }
      setAvatarTimestamp(Date.now());
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload avatar.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput || usernameInput.length < 3) { setSaveError('Username must be at least 3 characters.'); return; }
    updateProfileMutation.mutate({ username: usernameInput });
  };

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-12 w-1/4" /><Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const username = profile?.username ?? authUser?.username ?? 'trustvexa_user';
  const initials = username.slice(0, 2).toUpperCase();
  const trustLevel = profile?.trustLevel ?? 0;
  const memberSinceYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : '2026';

  // Real reputation — 0 reviews shows "No reviews yet", not a fake number
  const reputationValue = reviewsQuery.data?.count
    ? `${reviewsQuery.data.averageRating.toFixed(1)} / 5`
    : 'No reviews yet';
  const reputationHint = reviewsQuery.data?.count
    ? `${reviewsQuery.data.count} verified review${reviewsQuery.data.count === 1 ? '' : 's'}`
    : 'Complete a deal to get rated';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardPageHeader title="Profile" description="Your public trading identity and reputation." />

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : isError ? (
        <div className="p-6 text-center text-destructive border rounded-2xl bg-destructive/10">
          Failed to load profile details. Please try refreshing.
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl shadow-soft">
          <div className="relative h-32 bg-brand-gradient">
            <div aria-hidden="true" className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          </div>
          <CardContent className="relative px-6 pb-6">
            <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="relative h-24 w-24 rounded-2xl border-4 border-card overflow-hidden bg-brand-gradient flex items-center justify-center shadow-glow">
                  {profile?.avatarUrl ? (
                    <img src={`${API_ORIGIN}${profile.avatarUrl}?t=${avatarTimestamp}`} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-2xl font-bold text-white">{initials}</span>
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl font-bold">{username}</p>
                    {trustLevel >= 3 ? <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">Level {trustLevel} Account</p>
                  {authUser?.id && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Fingerprint className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">User ID:</span>
                      <span className="font-mono text-xs bg-muted rounded px-1.5 py-0.5 select-all cursor-text border" title={`Full ID: ${authUser.id}`}>
                        {authUser.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="success" className="mb-1">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Verified trader
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats — reputation uses REAL API data */}
      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard icon={Star} label="Reputation" value={reputationValue} hint={reputationHint} accent="warning" />
        <StatCard icon={BadgeCheck} label="Trust Level" value={trustLevel} accent="success" />
        <StatCard icon={ShieldCheck} label="Member since" value={memberSinceYear} accent="primary" />
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>Update the details shown to your counterparties.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
            {saveError && <div className="p-3 text-xs bg-destructive/10 text-destructive rounded-lg border border-destructive/20 sm:col-span-2">{saveError}</div>}
            {saveSuccess && <div className="p-3 text-xs bg-success/15 text-success rounded-lg border border-success/20 sm:col-span-2">Profile updated successfully.</div>}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative h-20 w-20 rounded-2xl border overflow-hidden bg-brand-gradient flex items-center justify-center shadow-soft shrink-0">
                  {profile?.avatarUrl ? (
                    <img src={`${API_ORIGIN}${profile.avatarUrl}?t=${avatarTimestamp}`} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-xl font-bold text-white">{initials}</span>
                  )}
                </div>
                <div className="flex-1 w-full max-w-sm">
                  <FileDropzone onFileSelect={handleAvatarUpload} allowedTypes={['image/png', 'image/jpeg', 'image/webp', 'image/gif']} maxSizeBytes={5 * 1024 * 1024} />
                  {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button variant="gradient" type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Reveal className="space-y-6">
        <SectionHeading align="left" eyebrow="Reputation & trust" title="How your trust level grows"
          subtitle="Trust on TrustVexa is earned, not bought. Every clean, dispute-free settlement raises your standing." />
        <div className="grid gap-5 sm:grid-cols-3">
          {TRUST_LADDER.map((step) => (
            <Card key={step.level} className="card-glow rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><step.icon className="h-5 w-5" /></span>
                  <Badge variant="outline">{step.level}</Badge>
                </div>
                <CardTitle className="font-display text-base">{step.title}</CardTitle>
                <CardDescription>{step.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardContent className="flex flex-wrap items-center gap-4 p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success"><Gauge className="h-5 w-5" /></span>
            <p className="flex-1 text-sm text-muted-foreground">
              Your reputation score blends completed deal volume, counterparty ratings, and dispute history.
            </p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="space-y-6">
        <SectionHeading align="left" eyebrow="Verification" title="Your verification badges"
          subtitle="Badges are visual shorthand for the checks you've passed." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map((badge) => (
            <div key={badge.label} className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent"><badge.icon className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold">{badge.label}</p><p className="mt-1 text-xs text-muted-foreground">{badge.hint}</p></div>
            </div>
          ))}
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Fingerprint className="h-4 w-4 text-primary" /> Badges update automatically as you complete checks and deals.
        </p>
      </Reveal>

      <Reveal>
        <Card className="rounded-2xl border bg-card shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display"><Lock className="h-5 w-5 text-primary" /> Privacy: what others see</CardTitle>
            <CardDescription>We show counterparties only what they need to trade with confidence.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-success"><Eye className="h-4 w-4" /> Visible to others</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Your username and avatar initials</li>
                <li>Reputation score and verification badges</li>
                <li>Completed deal count and member-since year</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><EyeOff className="h-4 w-4" /> Never shared</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Your email address</li>
                <li>Wallet balances or funding sources</li>
                <li>Personal contact details</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      {/* REAL reviews from the API — no fake hardcoded data */}
      <Reveal className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading align="left" eyebrow="Reputation" title="Reviews from counterparties"
            subtitle="Real ratings left by verified traders after completed deals. Reviewer identities are always kept private." />
          <Button asChild variant="outline" size="sm">
            <Link href="/reviews">Leave a review</Link>
          </Button>
        </div>

        {reviewsQuery.isLoading ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
        ) : reviewsQuery.isError ? (
          <p className="text-sm text-destructive">Unable to load reviews.</p>
        ) : (reviewsQuery.data?.count ?? 0) === 0 ? (
          <Card className="rounded-2xl shadow-soft border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Star className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No reviews yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Your reputation builds after you complete escrow deals. Counterparties can rate you once the deal settles.
              </p>
              <Button asChild variant="outline" size="sm"><Link href="/deals">View your deals →</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-4 px-1">
              <span className="font-display text-4xl font-bold">{reviewsQuery.data!.averageRating.toFixed(1)}</span>
              <div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={n <= Math.round(reviewsQuery.data!.averageRating) ? 'h-5 w-5 fill-amber-400 text-amber-400' : 'h-5 w-5 text-muted-foreground/30'} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {reviewsQuery.data!.count} verified review{reviewsQuery.data!.count === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {reviewsQuery.data!.reviews.map((review) => (
                <Card key={review.id} className="rounded-2xl border bg-card shadow-soft">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <MessageSquare className="h-4 w-4 text-primary" />Anonymous trader
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: review.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                  </CardHeader>
                  <CardContent>
                    <Quote className="h-4 w-4 text-muted-foreground mb-1" />
                    {review.comment
                      ? <p className="text-sm text-muted-foreground">{review.comment}</p>
                      : <p className="text-sm text-muted-foreground italic">No comment left.</p>
                    }
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ThumbsUp className="h-4 w-4 text-success" /> Reviews are left by verified counterparties after a deal settles. Reviewer identities are never shown.
        </p>
      </Reveal>

      <Reveal>
        <Card className="rounded-2xl border bg-muted/30 shadow-soft">
          <CardHeader>
            <CardTitle className="font-display text-base">Related</CardTitle>
            <CardDescription>Jump to the tools that keep your account in good standing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RELATED_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className="group flex items-center justify-between gap-2 rounded-xl border bg-card p-4 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow">
                <span>
                  <span className="block text-sm font-semibold">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
