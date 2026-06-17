import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldQuestion,
  Timer,
  Zap,
} from 'lucide-react';

import { ContactForm } from '@/components/contact-form';
import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { SectionHeading } from '@/components/visual/section-heading';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact | TrustVexa',
  description: 'Get in touch with the TrustVexa team for support, disputes, or general questions.',
};

const HELP: ReadonlyArray<{ icon: typeof Mail; title: string; body: React.ReactNode }> = [
  {
    icon: LifeBuoy,
    title: 'Support',
    body: 'Questions about a deal, funding, or payouts. Include your deal ID if you have one.',
  },
  {
    icon: ShieldQuestion,
    title: 'Disputes',
    body: (
      <>
        Open a dispute from the deal itself so a middleman can review it. See{' '}
        <Link
          href="/how-it-works"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          how it works
        </Link>
        .
      </>
    ),
  },
  {
    icon: Mail,
    title: 'Everything else',
    body: 'Partnerships, press, or feedback — send us a note and we’ll route it to the right place.',
  },
];

const SLA = [
  { icon: Timer, title: 'Middleman reply', value: 'Within 24 hours', tone: 'text-primary' },
  { icon: Zap, title: 'Seller payout', value: 'Usually within 1 hour', tone: 'text-success' },
  {
    icon: Clock,
    title: 'Business hours',
    value: 'Mon–Fri, plus monitored weekends',
    tone: 'text-accent',
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> We’re here to
            help
          </>
        }
        title="Contact us"
        subtitle="Pick the topic that fits, then send us a message. Our team typically responds within one business day."
      />

      {/* SLA / response band */}
      <section className="border-b bg-muted/20">
        <div className="container grid gap-6 py-12 sm:grid-cols-3">
          {SLA.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
                  <s.icon className={`h-5 w-5 ${s.tone}`} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    {s.title}
                  </p>
                  <p className="font-display font-semibold">{s.value}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Help topics + form */}
      <section className="section">
        <div className="container grid max-w-5xl gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5">
            {HELP.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="flex gap-4 rounded-2xl border bg-card/60 p-6 backdrop-blur transition-all hover:shadow-glow">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-display font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="rounded-2xl border bg-card p-7 shadow-soft md:p-8">
              <h2 className="font-display text-xl font-semibold">Send a message</h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">
                Fill in the form and we’ll get back to you shortly.
              </p>
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ teaser */}
      <section className="section border-t bg-muted/20">
        <div className="container max-w-3xl">
          <Reveal>
            <div className="flex flex-col items-center gap-5 rounded-3xl border bg-card/60 p-10 text-center backdrop-blur md:p-14">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                <HelpCircle className="h-7 w-7" aria-hidden="true" />
              </span>
              <SectionHeading
                title="Looking for a quick answer?"
                subtitle="Most questions about funding, fees, the split, disputes, and security are answered in our help center."
              />
              <Button asChild size="lg" variant="gradient">
                <Link href="/faq">Browse the FAQ</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
