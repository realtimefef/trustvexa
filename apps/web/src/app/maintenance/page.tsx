import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, Clock, Home, ShieldCheck, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Maintenance | TrustVexa',
  description:
    'TrustVexa is undergoing scheduled maintenance. Funds in escrow are safe — here is what is paused and when to try again.',
};

// Standalone maintenance page (Project Plan §12 "Site pages"). It lives outside
// the (marketing) route group on purpose, so it renders without the site header
// and footer — a self-contained screen that still works if the rest of the app
// is unavailable.
const PAUSED: ReadonlyArray<{ icon: typeof Wrench; title: string; body: string }> = [
  {
    icon: Wrench,
    title: 'New deposits & funding',
    body: 'Funding a deal may be temporarily unavailable. Do not send crypto until the status page shows deposits as operational.',
  },
  {
    icon: Clock,
    title: 'Releases & payouts',
    body: 'Release and settlement may be briefly delayed. Any pending action resumes automatically once maintenance ends.',
  },
  {
    icon: ShieldCheck,
    title: 'Your funds stay safe',
    body: 'Escrow balances and active deals are unaffected. Nothing is lost during maintenance — actions simply queue until we are back.',
  },
];

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-3xl space-y-10">
        {/* Header */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Wrench className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Maintenance
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            We&apos;ll be right back
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            TrustVexa is undergoing scheduled maintenance to keep the platform fast and secure. Your
            funds and active deals are safe.
          </p>
        </div>

        {/* What's paused */}
        <div className="grid gap-5 md:grid-cols-3">
          {PAUSED.map((item) => (
            <div
              key={item.title}
              className="h-full rounded-2xl border bg-card/60 p-6 backdrop-blur"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="font-display font-semibold">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>

        {/* When to try again */}
        <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">When to try again</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Maintenance windows are usually short. Wait a few minutes, then reload. The live
              status page always shows exactly what is paused and what is back online.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="gradient" size="lg">
            <Link href="/status">
              <Activity className="h-5 w-5" aria-hidden="true" /> Check live status
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="h-5 w-5" aria-hidden="true" /> Back to home
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
