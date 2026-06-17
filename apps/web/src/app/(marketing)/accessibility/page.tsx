import type { Metadata } from 'next';
import Link from 'next/link';
import { Accessibility, Activity, Eye, Keyboard, Volume2 } from 'lucide-react';

import { LegalLayout } from '@/components/visual/legal-layout';

export const metadata: Metadata = {
  title: 'Accessibility | TrustVexa',
  description: 'Our commitment to making TrustVexa usable for everyone.',
};

const LAST_UPDATED = 'June 2026';

const SECTIONS: ReadonlyArray<{ heading: string; body: ReadonlyArray<string> }> = [
  {
    heading: 'Our commitment',
    body: [
      'We want TrustVexa to be usable by everyone, including people who rely on assistive technologies. We aim to meet the WCAG 2.1 AA guidelines and treat accessibility as an ongoing effort rather than a one-time checkbox.',
      'This means every product update goes through an accessibility review. When new components are added to the interface, they are checked for keyboard operability, screen reader compatibility, and sufficient color contrast before shipping.',
    ],
  },
  {
    heading: 'What we do',
    body: [
      'We use semantic markup and labelled form controls, maintain keyboard operability and visible focus, support light and dark themes with sufficient color contrast, and respect your system reduced-motion preference.',
      'Interactive elements carry descriptive ARIA labels and roles. Error messages are associated with their form fields programmatically so assistive technologies can surface them correctly. Page structure uses landmark regions — main, nav, footer — to help screen reader users navigate quickly.',
    ],
  },
  {
    heading: 'Known limitations',
    body: [
      'Some complex interactive areas are still being improved. If you hit a barrier, telling us helps us prioritize a fix.',
      'We are aware that certain data-rich tables and animated elements may not yet provide an ideal experience for all assistive technology users. We are actively working to address these areas in upcoming releases.',
    ],
  },
  {
    heading: 'Feedback',
    body: [
      'If you experience any difficulty using the Service, please let us know the page and what went wrong so we can address it.',
      'Detailed reports — including which browser, operating system, and assistive technology you are using — help us reproduce and fix issues faster. There is no barrier too small to report; even minor friction matters.',
    ],
  },
];

export default function AccessibilityPage() {
  return (
    <LegalLayout
      eyebrow={
        <>
          <Accessibility className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Inclusive design
        </>
      }
      title="Accessibility"
      lastUpdated={LAST_UPDATED}
    >
      {/* Standards we target */}
      <div className="mb-10 rounded-2xl border bg-muted/30 p-7">
        <p className="font-display text-base font-semibold">Standards we target: WCAG 2.1 AA</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          WCAG 2.1 AA (Web Content Accessibility Guidelines) is the internationally recognised
          benchmark for accessible web content. It is organised around four principles:
        </p>
        <ul className="mt-4 space-y-3">
          {[
            {
              term: 'Perceivable',
              def: 'Information and interface components must be presentable to users in ways they can perceive — for example, providing text alternatives for images and captions for video.',
            },
            {
              term: 'Operable',
              def: 'Interface components and navigation must be operable by keyboard as well as mouse, and users must have enough time to read and use the content.',
            },
            {
              term: 'Understandable',
              def: 'Information and the operation of the interface must be understandable — predictable behavior, clear labels, and helpful error identification.',
            },
            {
              term: 'Robust',
              def: 'Content must be interpreted reliably by a wide variety of user agents, including current and future assistive technologies.',
            },
          ].map((item) => (
            <li key={item.term} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                ✓
              </span>
              <span className="text-muted-foreground">
                <strong className="font-medium text-foreground">{item.term} — </strong>
                {item.def}
              </span>
            </li>
          ))}
        </ul>
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
          </section>
        ))}
      </div>

      {/* Accessible features grid */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-semibold">Accessible features</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Keyboard className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Keyboard navigation</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Every interactive element — buttons, links, form fields, modal dialogs — can be
              reached and operated using only a keyboard. Focus order follows a logical reading
              sequence. Focus trapping is used inside modals so you don't accidentally leave them.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Volume2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Screen reader support</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Semantic HTML, ARIA landmarks, and descriptive labels give screen readers the context
              they need. Status updates — such as deal state changes — are announced via live
              regions so users don't have to navigate back to find them.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Reduced motion</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Animations and transitions respect the{' '}
              <code className="rounded bg-muted px-1 text-xs">prefers-reduced-motion</code> media
              query. When you set your OS to reduce motion, decorative animations are disabled and
              transitions become instant, avoiding potential vestibular triggers.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Color contrast</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Text and interactive elements meet the WCAG AA contrast ratio of at least 4.5:1 for
              normal text and 3:1 for large text. Both light and dark themes are validated. We never
              use color as the sole means of conveying information.
            </p>
          </div>
        </div>
      </div>

      {/* Testing */}
      <div className="mt-10 space-y-3">
        <h2 className="font-display text-lg font-semibold">Testing</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We test accessibility through a combination of keyboard-only walkthroughs and automated
          scanning tools integrated into our CI pipeline. Automated tools catch a meaningful portion
          of common issues — missing labels, low contrast, incorrect ARIA usage — and give us quick
          feedback on regressions.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We acknowledge that full accessibility validation requires manual testing with real
          assistive technologies — screen readers, switch controls, and voice input — and expert
          review. We are working toward more comprehensive manual testing coverage as the product
          matures. If you find something automated tools would miss, please let us know.
        </p>
      </div>

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        Reach us through the{' '}
        <Link
          href="/contact"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          contact page
        </Link>{' '}
        with any accessibility feedback.
      </p>

      {/* File an accessibility request callout */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-7">
        <p className="font-display font-semibold">File an accessibility request</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If you need a specific accommodation or want to report a barrier that is blocking your use
          of TrustVexa, email us directly. Include the page URL, a description of what you were
          trying to do, and the assistive technology you were using. We will respond within 5
          business days.
        </p>
        <p className="mt-4 text-sm">
          <a
            href="mailto:accessibility@trustvexa.com"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            accessibility@trustvexa.com
          </a>
        </p>
      </div>
    </LegalLayout>
  );
}
