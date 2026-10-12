import type { Metadata } from 'next';
import {
  CalendarClock, ClipboardCheck, FileSearch, FileText, GitCompare, ListChecks, RefreshCw,
  ScanSearch, ShieldAlert, UserCheck,
} from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { CtaBand } from '@/components/visual/cta-band';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'AI Contract Scanner & Deal Checker | TrustVexa',
  description:
    'TrustVexa is building an AI-powered contract scanner and deal checker that extracts key terms, flags risky clauses, and checks deals against company policy and playbooks.',
};

const CAPABILITIES: ReadonlyArray<{ icon: typeof FileSearch; title: string; body: string }> = [
  { icon: FileSearch, title: 'Contract & deal analysis', body: 'Analyzes contracts and deal documents and extracts key terms, obligations, parties, and dates.' },
  { icon: ShieldAlert, title: 'Risky clause detection', body: 'Flags risky or non-standard clauses so they receive a human look before anyone signs.' },
  { icon: ClipboardCheck, title: 'Policy & playbook checks', body: 'Checks deals against company policy and playbooks and shows exactly where a document deviates.' },
  { icon: RefreshCw, title: 'Re-checked every time', body: 'Content is re-checked every time a document is uploaded, edited, or re-submitted, so reviews always reflect the latest version.' },
  { icon: GitCompare, title: 'Clause comparison', body: 'Compares clauses against preferred language and earlier versions of the same document.' },
  { icon: FileText, title: 'Redline suggestions', body: 'Suggests redlines for flagged clauses for a reviewer to accept, edit, or reject.' },
  { icon: ListChecks, title: 'Risk scoring & summaries', body: 'Produces a risk score and a plain-language summary for every contract and deal.' },
  { icon: CalendarClock, title: 'Dates & obligations', body: 'Surfaces renewal dates, deadlines, and obligations so nothing is missed after signing.' },
  { icon: UserCheck, title: 'Human review', body: 'Consequential decisions stay with people. The scanner assists reviewers; it does not replace them.' },
];

const STEPS = [
  { title: 'Upload', body: 'Add a contract or deal document to a TrustVexa deal.' },
  { title: 'Scan', body: 'Key terms, obligations, dates, and risky clauses are extracted and scored.' },
  { title: 'Check', body: 'The deal is compared against your policy and playbooks.' },
  { title: 'Review', body: 'A human reviewer approves, edits, or rejects the suggested changes.' },
  { title: 'Re-check', body: 'Every new upload or edit triggers a fresh check of the latest version.' },
];

export default function ContractScannerPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <ScanSearch className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> AI contract scanner &amp; deal checker
          </>
        }
        title="Review every contract and deal before you commit"
        subtitle="An AI-powered scanner that extracts key terms, flags risky clauses, and checks each deal against your policy and playbooks — re-checked every time the content changes."
      >
        <Badge variant="warning">In development</Badge>
      </PageHero>

      <section className="section">
        <div className="container">
          <Reveal>
            <SectionHeading
              eyebrow="Capabilities"
              title="What the scanner will do"
              subtitle="This product is currently in development. The capabilities below describe what we are building and are not yet available."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 80}>
                <div className="card-glow group h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-display font-semibold">{c.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-t bg-muted/20">
        <div className="container max-w-5xl">
          <Reveal>
            <SectionHeading
              eyebrow="How it will work"
              title="From upload to audit-ready report"
              subtitle="Every check is logged, so you can show what was reviewed, what was flagged, and who approved it."
            />
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="h-full rounded-2xl border bg-card/60 p-5 backdrop-blur">
                  <span className="font-display text-2xl font-bold text-gradient opacity-60">{String(i + 1).padStart(2, '0')}</span>
                  <p className="mt-2 font-display text-sm font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="Alongside escrow"
        title="Protect the contract and the payment"
        subtitle="Use TrustVexa escrow today for milestone-based payments and neutral mediation while the AI contract scanner is in development."
        primaryLabel="Start a deal"
        primaryHref="/register"
        secondaryLabel="How escrow works"
        secondaryHref="/how-it-works"
      />
    </>
  );
}
