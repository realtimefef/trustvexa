import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Map, MessageCircle, LayoutDashboard, Info } from 'lucide-react';

import { PageHero } from '@/components/visual/page-hero';
import { Reveal } from '@/components/visual/reveal';
import { CtaBand } from '@/components/visual/cta-band';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sitemap | TrustVexa',
  description: 'A directory of the public pages on TrustVexa.',
};

const GROUPS: ReadonlyArray<{
  title: string;
  description: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}> = [
  {
    title: 'Product',
    description:
      'Core feature pages explaining how TrustVexa works, what it costs, and which coins are supported.',
    links: [
      { href: '/', label: 'Home' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/fees', label: 'Fees' },
      { href: '/coins', label: 'Supported coins' },
      { href: '/use-cases', label: 'Use cases' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    description:
      'Background on TrustVexa, the team, how to reach us, and our security and trust practices.',
    links: [
      { href: '/about', label: 'About' },
      { href: '/about-developer', label: 'About the developer' },
      { href: '/contact', label: 'Contact' },
      { href: '/security', label: 'Trust & Security Center' },
      { href: '/status', label: 'Platform status' },
    ],
  },
  {
    title: 'Legal',
    description:
      'Terms, privacy, cookies, dispute rules, and prohibited items — everything that governs use of the Service.',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/cookie', label: 'Cookie Policy' },
      { href: '/refund-dispute', label: 'Refund & Dispute Policy' },
      { href: '/prohibited', label: 'Prohibited items' },
      { href: '/accessibility', label: 'Accessibility' },
    ],
  },
  {
    title: 'Account',
    description: 'Sign up for a new account or log in to access your dashboard and active deals.',
    links: [
      { href: '/login', label: 'Log in' },
      { href: '/register', label: 'Create account' },
    ],
  },
  {
    title: 'Help & guides',
    description:
      'Step-by-step guidance, answers to common questions, and everything you need to use TrustVexa with confidence.',
    links: [
      { href: '/help', label: 'Help & Support Center' },
      { href: '/docs', label: 'Documentation' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/faq', label: 'FAQ' },
      { href: '/security', label: 'Security guide' },
      { href: '/fees', label: 'Fee calculator & schedule' },
      { href: '/coins', label: 'Supported coins & networks' },
      { href: '/contact', label: 'Contact support' },
    ],
  },
  {
    title: 'Dashboard (after login)',
    description:
      'Pages available once you are signed in — manage deals, your wallet, disputes, and account settings.',
    links: [
      { href: '/dashboard', label: 'Dashboard overview' },
      { href: '/deals/new', label: 'Create a new deal' },
      { href: '/messages', label: 'Messages' },
      { href: '/wallet', label: 'Wallet & withdrawal' },
      { href: '/calculator', label: 'Fee calculator' },
      { href: '/disputes', label: 'My disputes' },
      { href: '/documents', label: 'Document center' },
      { href: '/templates', label: 'Deal templates' },
      { href: '/referrals', label: 'Referral program' },
      { href: '/announcements', label: "Announcements & what's new" },
      { href: '/support', label: 'Support tickets' },
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <Map className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Directory
          </>
        }
        title="Sitemap"
        subtitle="Every public page on TrustVexa, in one place."
      />

      <section className="section">
        <div className="container max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {GROUPS.map((group, i) => (
              <Reveal key={group.title} delay={(i % 2) * 80}>
                <div className="h-full rounded-2xl border bg-card/60 p-6 backdrop-blur">
                  <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.title}
                  </h2>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {group.description}
                  </p>
                  <ul className="mt-4 space-y-1">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                        >
                          {link.label}
                          <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Can't find it? */}
          <Reveal delay={120}>
            <Card className="mt-10 rounded-2xl border bg-card shadow-soft card-glow">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <CardTitle className="font-display text-base">
                    Can&apos;t find what you need?
                  </CardTitle>
                  <CardDescription>
                    We are here to help — reach out directly or search the FAQ.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-0">
                <Button asChild variant="gradient" size="sm">
                  <Link href="/contact">Contact us</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/faq">Browse FAQ</Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>

          {/* About this sitemap */}
          <Reveal delay={160}>
            <div className="mt-8 rounded-2xl border bg-muted/30 p-6">
              <div className="flex items-start gap-3">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">About this sitemap</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This page is a human-readable index of the TrustVexa website. Each URL listed
                    uses a canonical{' '}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                      {'<link rel="canonical">'}
                    </code>{' '}
                    tag to avoid duplicate-content signals in search engines. An XML sitemap is also
                    served at{' '}
                    <Link
                      href="/sitemap.xml"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      /sitemap.xml
                    </Link>{' '}
                    for crawler discovery. If you notice a page that should be here but is missing,
                    please{' '}
                    <Link
                      href="/contact"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      let us know
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Dashboard section note */}
          <Reveal delay={200}>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-muted/30 p-6">
              <LayoutDashboard
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Authenticated pages</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Dashboard links require an active session. If you are not signed in, navigating to
                  those URLs will redirect you to the login page. Dashboard pages are excluded from
                  public search engine indexing via a{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                    noindex
                  </code>{' '}
                  directive to keep your deal and wallet information private.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
