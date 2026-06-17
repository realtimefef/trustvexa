'use client';

/**
 * Announcements & what's new (Project Plan §12). Two sections:
 *   - Announcements: admin broadcasts with per-user read state
 *     (`GET /announcements`, `POST /announcements/:id/read`, idempotent).
 *   - What's new: the product changelog feed (`GET /changelog`).
 */
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Megaphone, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

interface AnnouncementView {
  id: string;
  title: string | null;
  body: string | null;
  audience: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

interface ChangelogEntryView {
  id: string;
  version: string | null;
  title: string | null;
  body: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface AnnouncementsResponse {
  announcements: AnnouncementView[];
}

interface ChangelogResponse {
  entries: ChangelogEntryView[];
}

function formatDate(value: string | null): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '\u2014' : d.toLocaleDateString();
}

function useAnnouncements(enabled: boolean) {
  return useQuery({
    queryKey: ['announcements'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<AnnouncementsResponse>('/announcements');
      return res.announcements;
    },
  });
}

function useChangelog(enabled: boolean) {
  return useQuery({
    queryKey: ['changelog'],
    enabled,
    queryFn: async () => {
      const res = await apiRequest<ChangelogResponse>('/changelog');
      return res.entries;
    },
  });
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login?next=/announcements');
    }
  }, [status, router]);

  const announcementsQuery = useAnnouncements(status === 'authenticated');
  const changelogQuery = useChangelog(status === 'authenticated');

  const markReadMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/announcements/${id}/read`, {
        method: 'POST',
        body: {},
        idempotencyKey: newIdempotencyKey(),
      }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  const announcements = announcementsQuery.data ?? [];
  const entries = changelogQuery.data ?? [];
  const pendingId = markReadMutation.isPending ? markReadMutation.variables : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <DashboardPageHeader
        title="Announcements & what's new"
        description="Platform notices and the latest product updates, in one place."
      />

      <section className="space-y-5">
        <SectionHeading
          align="left"
          eyebrow="From the team"
          title="Announcements"
          subtitle="Broadcasts about maintenance, policy changes, and new features."
        />
        {announcementsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : announcementsQuery.isError ? (
          <p className="text-sm text-destructive">Unable to load announcements. Please refresh.</p>
        ) : announcements.length === 0 ? (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <Megaphone className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No announcements right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card
                key={announcement.id}
                className={cn(
                  'rounded-2xl shadow-soft transition-colors',
                  announcement.read ? '' : 'border-primary/40 bg-primary/[0.04]',
                )}
              >
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Megaphone className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Link href={`/announcements/${announcement.id}`} className="hover:underline">
                            {announcement.title ?? 'Announcement'}
                          </Link>
                          {announcement.read ? null : (
                            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                          )}
                        </CardTitle>
                        <CardDescription>{formatDate(announcement.createdAt)}</CardDescription>
                      </div>
                    </div>
                    {announcement.read ? (
                      <Badge variant="secondary">Read</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={markReadMutation.isPending}
                        onClick={() => markReadMutation.mutate(announcement.id)}
                      >
                        <Check className="h-4 w-4" />
                        {pendingId === announcement.id ? 'Marking\u2026' : 'Mark read'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {announcement.body ? (
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {announcement.body}
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <Reveal>
        <section className="space-y-5">
          <SectionHeading
            align="left"
            eyebrow="Product updates"
            title="What's new"
            subtitle="A running log of improvements so you can see TrustVexa is actively maintained."
          />
          {changelogQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : changelogQuery.isError ? (
            <p className="text-sm text-destructive">
              Unable to load the changelog. Please refresh.
            </p>
          ) : entries.length === 0 ? (
            <Card className="rounded-2xl shadow-soft">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Sparkles className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">No updates published yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="rounded-2xl border bg-card shadow-soft">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                        {entry.title ?? 'Update'}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {entry.version ? (
                          <Badge variant="outline" className="font-mono">
                            {entry.version}
                          </Badge>
                        ) : null}
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.publishedAt ?? entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {entry.body ? (
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {entry.body}
                      </p>
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
