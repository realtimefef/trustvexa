'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, LifeBuoy, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/visual/aurora-background';
import { BrandLogo } from '@/components/visual/brand-logo';

/** App-wide error boundary (Next.js error.tsx). Must be a client component. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surface to the console; a real logger/Sentry hook can go here.
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <AuroraBackground />

      <Link href="/" className="mb-10">
        <BrandLogo />
      </Link>

      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </span>

      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        An unexpected error occurred while loading this page. You can try again, or head back home —
        your funds and deals are unaffected.
      </p>

      {error?.digest ? (
        <p className="mt-4 rounded-lg border bg-muted/40 px-3 py-1.5 font-mono text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" variant="gradient" onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" /> Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">
            <Home className="h-4 w-4" /> Back home
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/contact">
            <LifeBuoy className="h-4 w-4" /> Contact support
          </Link>
        </Button>
      </div>
    </main>
  );
}
