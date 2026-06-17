'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Megaphone, Check, Calendar, Users, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, newIdempotencyKey } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

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

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { status } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (status === 'anonymous') {
      router.replace(`/login?next=/announcements/${id}`);
    }
  }, [status, router, id]);

  // Fetch single announcement details
  const announcementQuery = useQuery({
    queryKey: ['announcement-detail', id],
    enabled: status === 'authenticated' && !!id,
    queryFn: async () => apiRequest<AnnouncementView>(`/announcements/${id}`),
  });

  const markReadMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/announcements/${id}/read`, {
        method: 'POST',
        body: {},
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['announcement-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  if (status !== 'authenticated' || announcementQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (announcementQuery.isError || !announcementQuery.data) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-center py-20 space-y-4">
        <Megaphone className="h-12 w-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Announcement Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This notice may have expired or is not directed to your account type.
        </p>
        <Button asChild variant="outline">
          <Link href="/announcements">Back to Announcements</Link>
        </Button>
      </div>
    );
  }

  const ann = announcementQuery.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/announcements" className="hover:underline flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Announcements & updates
          </Link>
        </div>
      </header>

      {/* Main card */}
      <Card className="rounded-2xl border bg-card/60 backdrop-blur shadow-soft overflow-hidden">
        <CardHeader className="border-b bg-muted/10 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Megaphone className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1 min-w-0">
                <CardTitle className="text-lg font-bold text-foreground leading-tight truncate">
                  {ann.title ?? 'System Announcement'}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(ann.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 capitalize">
                    <Users className="h-3.5 w-3.5" />
                    Audience: {ann.audience || 'All'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ann.read ? (
                <Badge variant="secondary" className="flex items-center gap-1 h-7">
                  <Check className="h-3.5 w-3.5" /> Read
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={markReadMutation.isPending}
                  onClick={() => markReadMutation.mutate()}
                  className="h-8 text-xs font-semibold"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  {markReadMutation.isPending ? 'Marking...' : 'Mark read'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          {ann.body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground select-text font-sans">
              {ann.body}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground text-center py-6">
              No content provided.
            </p>
          )}

          <div className="border-t border-border/40 pt-4 flex items-start gap-2.5 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p>
              This is a secure system broadcast. Platform notices are archived for auditing and compliance tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
