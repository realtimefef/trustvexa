import Link from 'next/link';
import { Github, Linkedin, Twitter } from 'lucide-react';

import { BrandLogo } from '@/components/visual/brand-logo';

const FOOTER_SECTIONS: ReadonlyArray<{
  title: string;
  links: ReadonlyArray<{ href: string; label: string }>;
}> = [
  {
    title: 'Product',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/use-cases', label: 'Use cases' },
      { href: '/fees', label: 'Fees' },
      { href: '/crypto', label: 'Crypto settlement' },
      { href: '/coins', label: 'Supported assets' },
      { href: '/security', label: 'Trust & Security' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/cookie', label: 'Cookie Policy' },
      { href: '/refund-dispute', label: 'Refund & Dispute' },
      { href: '/prohibited', label: 'Prohibited items' },
      { href: '/accessibility', label: 'Accessibility' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/about-developer', label: 'Team & mission' },
      { href: '/contact', label: 'Contact' },
      { href: '/sitemap', label: 'Sitemap' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'Help Center' },
      { href: '/docs', label: 'Documentation' },
      { href: '/status', label: 'Status' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
];

// Public social profiles, supplied via env. Only entries with a configured URL
// are rendered — shipping icons that link to a platform's own homepage looks
// like an unfinished site, so an unset profile is simply hidden instead.
const SOCIALS = [
  { href: process.env.NEXT_PUBLIC_SOCIAL_X ?? '', label: 'X', Icon: Twitter },
  { href: process.env.NEXT_PUBLIC_SOCIAL_GITHUB ?? '', label: 'GitHub', Icon: Github },
  { href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? '', label: 'LinkedIn', Icon: Linkedin },
].filter((social) => social.href.trim().length > 0);

/** Public site footer. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t bg-muted/20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[44rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-[0.08] blur-3xl"
      />
      <div className="container grid gap-10 py-16 sm:grid-cols-2 md:grid-cols-6">
        <div className="space-y-4 md:col-span-2">
          <BrandLogo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Secure escrow infrastructure for freelancers, marketplaces, and B2B transactions.
            Milestone-based releases, a neutral mediator, and a tamper-evident ledger.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            1007 N Orange St, 4th Floor
            <br />
            Wilmington, DE 19801, USA
            <br />
            <a
              href="mailto:support@trustvexa.com"
              className="transition-colors hover:text-foreground"
            >
              support@trustvexa.com
            </a>
          </p>
          {SOCIALS.length > 0 && (
            <div className="flex items-center gap-3 pt-1">
              {SOCIALS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground hover:shadow-glow"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <p className="text-sm font-semibold">{section.title}</p>
            <ul className="space-y-2.5">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="container flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TrustVexa. All rights reserved.</p>
          <p>
            Escrow and dispute resolution. Not a bank. Funds are held in escrow, not on deposit.
          </p>
        </div>
      </div>
    </footer>
  );
}
