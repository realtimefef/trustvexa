import type { Metadata } from 'next';
import Link from 'next/link';
import { Cookie, ShieldCheck, Settings2, BarChart3 } from 'lucide-react';

import { LegalLayout } from '@/components/visual/legal-layout';

export const metadata: Metadata = {
  title: 'Cookie Policy | TrustVexa',
  description: 'How TrustVexa uses cookies and how you can control them.',
};

const LAST_UPDATED = 'June 2026';

const SECTIONS: ReadonlyArray<{ heading: string; body: ReadonlyArray<string> }> = [
  {
    heading: '1. What cookies are',
    body: [
      'Cookies are small text files stored on your device by your browser. We also use similar technologies such as local storage. Together they let the Service work, keep you signed in, and remember your preferences.',
    ],
  },
  {
    heading: '2. Essential cookies',
    body: [
      'These are required to run TrustVexa and cannot be switched off. They keep your session secure, protect against fraud and cross-site request forgery, and remember your cookie choice so we do not ask on every visit.',
    ],
  },
  {
    heading: '3. Functional cookies',
    body: [
      'These remember preferences such as your theme. They are optional and only set if you accept them in the consent banner.',
    ],
  },
  {
    heading: '4. Analytics',
    body: [
      'If enabled in the future, analytics would help us understand aggregate usage to improve the Service. These are optional and only set with your consent.',
    ],
  },
  {
    heading: '5. Managing your choice',
    body: [
      'When you first visit, a banner lets you accept or decline non-essential cookies. Your choice is stored on your device and recorded so we can honor it. You can change it at any time by clearing the site data in your browser, which will show the banner again.',
    ],
  },
  {
    heading: '6. Third-party cookies',
    body: [
      'TrustVexa does not use third-party advertising cookies, social-media tracking pixels, or cross-site tracking technologies of any kind. We do not allow ad networks or data brokers to set cookies through our pages.',
      'All cookies set on trustvexa.com originate from the trustvexa.com domain itself (first-party cookies). We may use first-party cookies from infrastructure providers that are contractually bound to our privacy standards and prohibited from using your data for their own purposes.',
    ],
  },
  {
    heading: '7. Cookie list',
    body: [
      'The table below lists the specific cookies we set, what each one does, and how long it persists. This list is reviewed and updated whenever our cookie use changes.',
    ],
  },
];

const COOKIE_TYPES = [
  {
    icon: ShieldCheck,
    title: 'Essential',
    description: 'Always active. Required for login, security, and CSRF protection.',
    badge: 'Required',
  },
  {
    icon: Settings2,
    title: 'Functional',
    description: 'Optional. Remembers preferences like your colour theme.',
    badge: 'Optional',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Optional. Aggregate usage data to improve the Service — not active yet.',
    badge: 'Optional',
  },
];

const COOKIE_TABLE = [
  {
    name: 'session_id',
    purpose: 'Authenticates your logged-in session and keeps you signed in securely.',
    duration: 'Session (cleared on browser close)',
  },
  {
    name: 'theme_pref',
    purpose: 'Remembers your chosen colour theme (light or dark) between visits.',
    duration: '1 year',
  },
  {
    name: 'cookie_consent',
    purpose: 'Stores your cookie consent choice so the banner is not shown on every visit.',
    duration: '1 year',
  },
];

const BROWSER_GUIDES = [
  { name: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
  { name: 'Firefox', url: 'https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox' },
  { name: 'Safari', url: 'https://support.apple.com/guide/safari/sfri11471' },
  {
    name: 'Edge',
    url: 'https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge',
  },
];

export default function CookiePage() {
  return (
    <LegalLayout
      eyebrow={
        <>
          <Cookie className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Legal
        </>
      }
      title="Cookie Policy"
      lastUpdated={LAST_UPDATED}
    >
      {/* Cookie types at a glance — 3-column summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {COOKIE_TYPES.map(({ icon: Icon, title, description, badge }) => (
          <div
            key={title}
            className="flex flex-col gap-3 rounded-2xl border bg-card/60 p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              </span>
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {badge}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="font-display text-lg font-semibold">{section.heading}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {/* Inline cookie table after section 7 */}
            {section.heading === '7. Cookie list' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Name
                      </th>
                      <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Purpose
                      </th>
                      <th className="pb-2 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIE_TABLE.map((row) => (
                      <tr key={row.name} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-mono text-xs text-foreground align-top">
                          {row.name}
                        </td>
                        <td className="py-3 pr-4 text-xs leading-relaxed text-muted-foreground align-top">
                          {row.purpose}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground align-top whitespace-nowrap">
                          {row.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* How to clear cookies */}
      <div className="mt-8 rounded-2xl border bg-muted/30 p-5">
        <p className="mb-3 text-sm font-semibold">How to clear cookies in your browser</p>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Clearing site data will remove all cookies set by TrustVexa, including your session and
          consent choice. You will be signed out and the consent banner will reappear on your next
          visit.
        </p>
        <ul className="flex flex-wrap gap-3">
          {BROWSER_GUIDES.map((b) => (
            <li key={b.name}>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {b.name} →
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        For more on how we handle data, see our{' '}
        <Link
          href="/privacy"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
