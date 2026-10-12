import Link from 'next/link';
import { ArrowRight, ScanSearch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/visual/reveal';

/** Compact callout pointing to the AI contract scanner & deal checker (in development). */
export function ContractScannerCallout() {
  return (
    <section className="section relative overflow-hidden border-t">
      <div className="container max-w-4xl">
        <Reveal>
          <div className="flex flex-col gap-4 rounded-2xl border border-dashed bg-card/60 p-7 backdrop-blur sm:flex-row sm:items-center sm:gap-7">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanSearch className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="font-display text-lg font-semibold">
                AI contract scanner &amp; deal checker
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                We are building an AI-powered scanner that extracts key terms, obligations, and dates, flags risky
                or non-standard clauses, and checks deals against company policy and playbooks — re-checked every
                time a document is uploaded, edited, or re-submitted, with human review for consequential decisions.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/contract-scanner">
                Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
