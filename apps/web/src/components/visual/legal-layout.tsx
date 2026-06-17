import Link from 'next/link';
import { ArrowRight, FileText, LifeBuoy, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';

const RELATED = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/cookie', label: 'Cookie Policy' },
  { href: '/refund-dispute', label: 'Refund & Dispute' },
  { href: '/prohibited', label: 'Prohibited items' },
  { href: '/accessibility', label: 'Accessibility' },
];

/** Shared reading layout for legal/policy pages: hero band + centered article card. */
export function LegalLayout({
  eyebrow,
  title,
  lastUpdated,
  badge,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lastUpdated?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={lastUpdated ? `Last updated: ${lastUpdated}` : undefined}
      >
        {badge}
      </PageHero>
      <section className="section">
        <div className="container max-w-3xl">
          <div className="rounded-2xl border bg-card/60 p-8 shadow-soft backdrop-blur md:p-10">
            {children}
          </div>
        </div>
      </section>

      {/* Related policies */}
      <section className="border-t bg-muted/20 py-16">
        <div className="container max-w-4xl">
          <Reveal>
            <div className="mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold">Related policies</h2>
            </div>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {RELATED.map((r, i) => (
              <Reveal key={r.href} delay={(i % 3) * 70}>
                <Link
                  href={r.href}
                  className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <span className="font-medium">{r.label}</span>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">Questions about this policy?</p>
                  <p className="text-sm text-muted-foreground">
                    Our team is happy to clarify anything before you trade.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/security">
                    <ShieldCheck className="h-4 w-4" /> Security center
                  </Link>
                </Button>
                <Button asChild variant="gradient">
                  <Link href="/contact">Contact us</Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
