'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Calendar, ArrowRight, RefreshCw } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/api/client';

interface ChangelogEntryView {
  id: string;
  version: string | null;
  title: string | null;
  body: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface ChangelogResponse {
  entries: ChangelogEntryView[];
}

function formatDate(value: string | null): string {
  if (!value) return '\u2014';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '\u2014'
    : d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
}

function useChangelog() {
  return useQuery({
    queryKey: ['public-changelog'],
    queryFn: async () => {
      const res = await apiRequest<ChangelogResponse>('/changelog');
      return res.entries;
    },
  });
}

export default function ChangelogPage() {
  const { data: entries, isLoading, isError, refetch } = useChangelog();

  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Product Updates
          </>
        }
        title="What's new in TrustVexa"
        subtitle="A running log of features, enhancements, and bug fixes added to the platform as we actively build and maintain the secure escrow experience."
      />

      <section className="section py-12">
        <div className="container max-w-4xl space-y-10">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <Card key={n} className="rounded-2xl border bg-card/60 p-6 backdrop-blur">
                  <div className="h-6 w-1/3 animate-pulse rounded bg-muted mb-3" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-muted mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
                  </div>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Reveal>
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
                <p className="text-sm text-destructive font-medium">
                  Failed to load product updates feed.
                </p>
                <button
                  onClick={() => void refetch()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/95 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              </div>
            </Reveal>
          ) : !entries || entries.length === 0 ? (
            <Reveal>
              <Card className="rounded-2xl border bg-card/60 p-12 text-center backdrop-blur">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No changelog entries have been published yet.
                </p>
              </Card>
            </Reveal>
          ) : (
            <div className="space-y-8">
              {entries.map((entry, idx) => (
                <Reveal key={entry.id} delay={idx * 50}>
                  <Card className="rounded-2xl border bg-card/40 hover:bg-card/60 transition-colors shadow-soft backdrop-blur-xl">
                    <CardHeader className="pb-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="text-xl font-display font-bold text-foreground">
                            {entry.title ?? 'System Update'}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(entry.publishedAt ?? entry.createdAt)}</span>
                          </div>
                        </div>
                        {entry.version ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs px-2.5 py-0.5 border-primary/20 bg-primary/5 text-primary"
                          >
                            v{entry.version}
                          </Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    {entry.body ? (
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {entry.body}
                        </p>
                      </CardContent>
                    ) : null}
                  </Card>
                </Reveal>
              ))}
            </div>
          )}

          {/* User notice */}
          <Reveal delay={150}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/30 p-6">
              <div>
                <p className="text-sm font-semibold">Have feature suggestions?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We are always listening to user feedback to improve platform safety and speed.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Submit feedback <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
