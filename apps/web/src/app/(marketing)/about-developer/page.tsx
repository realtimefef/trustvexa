import type { Metadata } from 'next';
import Link from 'next/link';
import { Brain, Building2, Code2, Compass, Mail, MapPin, ShieldCheck, Target } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Team & mission | TrustVexa',
  description:
    'The people behind TrustVexa — secure escrow infrastructure for freelancers, marketplaces, and B2B transactions, with neutral dispute mediation.',
};

const TEAM: ReadonlyArray<{
  icon: typeof Code2;
  name: string;
  role: string;
  bio: string;
}> = [
  {
    icon: Code2,
    name: 'Ethan R. Caldwell',
    role: 'Founder & Lead Developer',
    bio: 'Ethan designed and built TrustVexa from the ground up: the milestone escrow model, the funding verification flow, the dispute process, and the security controls that keep funds safe while a deal is in progress.',
  },
  {
    icon: MapPin,
    name: 'Jonathan M. Pierce',
    role: 'US Operations Lead',
    bio: 'Jonathan leads US operations, overseeing the day-to-day running of the mediation service. He keeps deals moving, coordinates dispute reviews, and makes sure support is responsive and fair to both sides.',
  },
];

export default function AboutDeveloperPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Team & mission
          </>
        }
        title="The people behind TrustVexa"
        subtitle="We build escrow infrastructure for freelancers, marketplaces, and B2B transactions — milestone-based releases with a neutral mediator standing between the two sides."
      />

      <section className="section">
        <div className="container max-w-4xl space-y-14">
          {/* Mission */}
          <Reveal>
            <div className="rounded-2xl border bg-card/60 p-6 backdrop-blur sm:p-8">
              <div className="flex items-start gap-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div className="space-y-2">
                  <p className="font-display text-lg font-semibold">Our mission</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Most online work still starts with one side taking a leap of faith. A freelancer
                    delivers and hopes to get paid; a buyer pays and hopes the work arrives.
                    TrustVexa removes that gamble: funds are verified and held in escrow, released
                    against agreed milestones, and a neutral mediator reviews the evidence if
                    something goes wrong. The goal is simple — let people transact with strangers as
                    safely as they would with a long-standing client.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Team */}
          <div className="space-y-6">
            <h2 className="font-display text-xl font-semibold">Who we are</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {TEAM.map((member, i) => (
                <Reveal key={member.name} delay={(i % 2) * 80}>
                  <div className="card-glow h-full rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <member.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="font-display text-lg font-semibold">{member.name}</p>
                    <p className="text-sm font-medium text-primary">{member.role}</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {member.bio}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Where we are */}
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-6 shadow-soft">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Where we are</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  TrustVexa is operated by a privately held, multi-investor-funded company based at
                  1007 N Orange St, 4th Floor, Wilmington, DE 19801, USA. Reach the team at{' '}
                  <a
                    href="mailto:support@trustvexa.com"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    support@trustvexa.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </Reveal>

          {/* Principles */}
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Built on neutrality</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The mediator never takes a side. Decisions are based on the deal terms and the
                  evidence each party submits — nothing else. That neutrality is what makes escrow
                  worth trusting.
                </p>
              </div>
            </div>
          </Reveal>

          {/* What we are building next */}
          <Reveal>
            <div className="rounded-2xl border border-dashed bg-card/40 p-6 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Brain className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="font-display text-base font-semibold">What we are building next</p>
                <Badge variant="outline">Planned</Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Our next engineering focus is AI-assisted trust: risk scoring that flags suspicious
                deal patterns before funding, and an assistant that summarises dispute evidence so
                mediators reach fair decisions faster. Neither has shipped yet, and the final call on
                a dispute will stay with a person.
              </p>
            </div>
          </Reveal>

          {/* Contact */}
          <Reveal delay={80}>
            <Card className="rounded-2xl border bg-card shadow-soft card-glow">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <CardTitle className="font-display text-base">Get in touch</CardTitle>
                  <CardDescription>
                    Questions about a deal, the platform, or working with us? We are happy to hear
                    from you.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="gradient" size="sm">
                  <Link href="/contact">Contact us</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
