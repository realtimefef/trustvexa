import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/visual/reveal';

/** Large, branded closing call-to-action band reused across marketing pages. */
export function CtaBand({
  eyebrow = 'Start in minutes',
  title = 'Ready to trade with confidence?',
  subtitle = 'Create your account and open your first escrow deal in minutes. No setup fees, no surprises.',
  primaryLabel = 'Create free account',
  primaryHref = '/register',
  secondaryLabel = 'View pricing',
  secondaryHref = '/fees',
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="section relative overflow-hidden">
      <div className="container">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border bg-brand-gradient p-10 text-center text-white shadow-glow-lg md:p-16">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-grid opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            />
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {eyebrow}
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {title}
              </h2>
              <p className="max-w-xl text-base text-white/85 sm:text-lg">{subtitle}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="xl"
                  className="bg-white text-primary hover:bg-white/90 hover:shadow-glow-lg"
                >
                  <Link href={primaryHref}>
                    {primaryLabel} <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={secondaryHref}>{secondaryLabel}</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
