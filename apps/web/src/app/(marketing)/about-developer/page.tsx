import type { Metadata } from 'next';
import Link from 'next/link';
import { Code2, Compass, Mail, MapPin, ShieldCheck, Target } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About the developer | TrustVexa',
  description:
    'The people behind TrustVexa — a platform built for the private, secure transfer of money and goods, backed by a neutral middleman.',
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
    bio: 'Ethan designed and built TrustVexa from the ground up, focusing on a crypto-only escrow flow that protects both sides of a deal. His work covers the verification model, the dispute process, and the security that keeps funds safe in escrow.',
  },
  {
    icon: MapPin,
    name: 'Jonathan M. Pierce',
    role: 'US Operations Lead',
    bio: 'Jonathan leads US operations, overseeing the day-to-day running of the middleman service. He keeps deals moving, coordinates dispute reviews, and makes sure support is responsive and fair to buyers and sellers alike.',
  },
];

export default function AboutDeveloperPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Compass className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> About the developer
          </>
        }
        title="The people behind TrustVexa"
        subtitle="TrustVexa was built for the private, secure transfer of money and goods — escrow you can trust, with a neutral middleman standing between buyer and seller."
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
                    TrustVexa exists for the private, secure transfer of money and goods. Online
                    deals between strangers carry real risk, so we put a neutral middleman and
                    crypto-only escrow between the two parties. Funds are held safely until the
                    buyer confirms delivery, and a clear dispute process is there if anything goes
                    wrong. The goal is simple: let people trade with confidence.
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

          {/* Principles */}
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Built on neutrality</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The middleman never takes a side. Decisions are based on the deal terms and the
                  evidence each party submits — nothing else. That neutrality is what makes escrow
                  worth trusting.
                </p>
              </div>
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
