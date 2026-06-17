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
      { href: '/fees', label: 'Fees' },
      { href: '/coins', label: 'Supported coins' },
      { href: '/use-cases', label: 'Use cases' },
      { href: '/faq', label: 'FAQ' },
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
      { href: '/about-developer', label: 'About the developer' },
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
      { href: '/security', label: 'Security' },
    ],
  },
];

const SOCIALS = [
  { href: 'https://twitter.com', label: 'Twitter', Icon: Twitter },
  { href: 'https://github.com', label: 'GitHub', Icon: Github },
  { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
];

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
            Private, secure, crypto-only escrow with a neutral middleman. Trade digital goods and
            accounts with confidence from start to finish.
          </p>
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
          <p>Crypto-only escrow. Not a bank. Funds are held in escrow, not on deposit.</p>
        </div>
      </div>
    </footer>
  );
}
