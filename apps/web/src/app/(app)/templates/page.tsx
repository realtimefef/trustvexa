'use client';

/**
 * Deal templates (Project Plan §12). Static, presentational overview of the
 * four deal template types and what each one pre-fills (delivery checklist,
 * evidence requirements, inspection window). Each card links to the deal
 * wizard at `/deals/new`. No backend list endpoint is required.
 */
import Link from 'next/link';
import {
  ArrowRight,
  CheckSquare,
  ClipboardList,
  Code2,
  FileCheck2,
  Handshake,
  Search,
  Settings2,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardPageHeader } from '@/components/dashboard-page-header';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';

type Template = {
  id: string;
  icon: typeof UserRound;
  title: string;
  blurb: string;
  prefills: { checklist: string; evidence: string; inspection: string };
};

const TEMPLATES: ReadonlyArray<Template> = [
  {
    id: 'account_sale',
    icon: UserRound,
    title: 'Account sale',
    blurb: 'Transfer of an online account, profile, or gaming asset to the buyer.',
    prefills: {
      checklist: 'Credentials handed over, recovery details cleared, ownership reassigned.',
      evidence: 'Login proof, original-email change confirmation, screenshots of access.',
      inspection: 'Short window for the buyer to confirm they can sign in and control the account.',
    },
  },
  {
    id: 'digital_product',
    icon: Code2,
    title: 'Digital product',
    blurb: 'A file, license key, source code, or other downloadable digital good.',
    prefills: {
      checklist: 'Files delivered, license key issued, download link verified working.',
      evidence: 'Delivery receipt, key activation proof, file hash or version.',
      inspection: 'Time for the buyer to download, open, and verify the product matches.',
    },
  },
  {
    id: 'service_delivery',
    icon: Handshake,
    title: 'Service delivery',
    blurb: 'Work performed to an agreed brief — design, development, or other services.',
    prefills: {
      checklist: 'Scope agreed, milestones set, final deliverables submitted.',
      evidence: 'Deliverable files, before/after proof, written sign-off on the brief.',
      inspection: 'Review window to check the work against the agreed acceptance criteria.',
    },
  },
  {
    id: 'custom',
    icon: Settings2,
    title: 'Custom',
    blurb: 'A blank starting point you tailor end to end for an unusual deal.',
    prefills: {
      checklist: 'You define each handover step for this specific arrangement.',
      evidence: 'You choose what proof both sides must provide.',
      inspection: 'You set the inspection window that fits the deal.',
    },
  },
];

const PREFILL_LEGEND = [
  {
    icon: CheckSquare,
    title: 'Delivery checklist',
    body: 'The step-by-step handover both parties tick off so nothing is missed before release.',
  },
  {
    icon: FileCheck2,
    title: 'Evidence requirements',
    body: 'The proof each side uploads, locked as a record a middleman can review in a dispute.',
  },
  {
    icon: Search,
    title: 'Inspection window',
    body: 'The time the buyer has to verify delivery before funds auto-release from escrow.',
  },
];

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardPageHeader
        title="Deal templates"
        description="Start from a template that pre-fills the checklist, evidence, and inspection settings for your deal type."
        action={
          <Button asChild>
            <Link href="/deals/new">
              <ClipboardList className="h-4 w-4" /> New deal
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col rounded-2xl border bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <template.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="font-display text-lg">{template.title}</CardTitle>
                  <CardDescription>{template.blurb}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <dl className="space-y-3 text-sm">
                <div className="space-y-1">
                  <dt className="flex items-center gap-2 font-medium">
                    <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" /> Checklist
                  </dt>
                  <dd className="text-muted-foreground">{template.prefills.checklist}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-2 font-medium">
                    <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" /> Evidence
                  </dt>
                  <dd className="text-muted-foreground">{template.prefills.evidence}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="flex items-center gap-2 font-medium">
                    <Search className="h-4 w-4 text-primary" aria-hidden="true" /> Inspection
                  </dt>
                  <dd className="text-muted-foreground">{template.prefills.inspection}</dd>
                </div>
              </dl>
              <div className="mt-auto flex items-center justify-between pt-2">
                <Badge variant="outline" className="font-mono text-[11px]">
                  {template.id}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/deals/new">
                    Use this template <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Reveal>
        <section className="space-y-6">
          <SectionHeading
            align="left"
            eyebrow="What gets pre-filled"
            title="Every template sets three things"
            subtitle="Templates are a head start — you can adjust any of these while creating the deal."
          />
          <div className="grid gap-5 sm:grid-cols-3">
            {PREFILL_LEGEND.map((item) => (
              <Card key={item.title} className="rounded-2xl border bg-card shadow-soft">
                <CardContent className="space-y-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="font-display font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
