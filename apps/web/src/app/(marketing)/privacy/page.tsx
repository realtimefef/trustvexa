import type { Metadata } from 'next';
import Link from 'next/link';
import { Lock, Eye, FilePen, Trash2, Download, ShieldOff, KeyRound, UserX } from 'lucide-react';

import { LegalLayout } from '@/components/visual/legal-layout';
import { PolicyVersionBadge } from '@/components/policy-version-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Privacy Policy | TrustVexa',
  description: 'How TrustVexa collects, uses, and protects your personal data.',
};

const LAST_UPDATED = 'June 2026';

const SECTIONS: ReadonlyArray<{ heading: string; body: ReadonlyArray<string> }> = [
  {
    heading: '1. Information we collect',
    body: [
      'Account data such as your username, email, and authentication details; deal data such as amounts, settlement assets and networks, counterparties, and the terms you agree to; and technical data such as device, log, and security information needed to operate the Service.',
    ],
  },
  {
    heading: '2. How we use your information',
    body: [
      'We use your information to operate escrow deals, verify identities and prevent fraud, mediate disputes, send transactional and security notifications, comply with legal obligations, and improve the Service.',
    ],
  },
  {
    heading: '3. How we protect it',
    body: [
      'Sensitive deal details are encrypted at rest, and access is restricted on a need-to-know basis. The presence of a mediator on a deal is kept confidential to protect both parties. Financial records are stored in an append-only ledger for integrity.',
    ],
  },
  {
    heading: '4. Sharing',
    body: [
      'We share data with the counterparty and mediator strictly as needed to complete a deal, with service providers who help us operate (such as infrastructure and email providers), and with authorities where required by law. We do not sell your personal data.',
    ],
  },
  {
    heading: '5. Cookies',
    body: [
      'We use essential cookies to keep you signed in and to secure the Service, and limited functional cookies to remember preferences. You can manage non-essential cookies through the consent banner shown on your first visit.',
    ],
  },
  {
    heading: '6. Data retention',
    body: [
      'We retain deal and ledger records for as long as needed to meet legal, accounting, and dispute-resolution requirements. Other personal data is retained only as long as your account is active or as the law requires.',
    ],
  },
  {
    heading: '7. Your rights',
    body: [
      'Depending on your jurisdiction, you may have rights to access, correct, export, or delete your personal data, and to object to certain processing. To exercise these rights, contact us through the contact page.',
    ],
  },
  {
    heading: '8. Changes',
    body: [
      'We may update this policy from time to time. Material changes will be communicated through the Service, and the "last updated" date above will change.',
    ],
  },
  {
    heading: '9. Contact for privacy requests',
    body: [
      'To exercise any of your privacy rights — including access, correction, deletion, or data export — please submit your request via the contact page. Include your registered email address and a brief description of the right you wish to exercise.',
      'We aim to acknowledge all privacy requests within 5 business days and to provide a substantive response within 30 calendar days. For complex requests we may extend this period by up to an additional 30 days and will notify you if that is the case.',
      'If you believe we have not addressed your concern adequately, you have the right to lodge a complaint with the relevant data protection authority in your jurisdiction.',
    ],
  },
];

const RIGHTS = [
  {
    icon: Eye,
    title: 'Access',
    description:
      'Request a copy of the personal data we hold about you, including account and deal records.',
  },
  {
    icon: FilePen,
    title: 'Correct',
    description: 'Ask us to update inaccurate or incomplete information linked to your account.',
  },
  {
    icon: Trash2,
    title: 'Delete',
    description:
      'Request erasure of your personal data where we have no legal obligation to keep it.',
  },
  {
    icon: Download,
    title: 'Export',
    description:
      'Receive your data in a portable, machine-readable format to transfer to another service.',
  },
];

const NEVER_DO = [
  {
    icon: ShieldOff,
    text: 'We never sell your personal data to advertisers, data brokers, or any third party.',
  },
  {
    icon: UserX,
    text: 'We never show your email address or real name to other users — they see only your username and trust badge.',
  },
  {
    icon: KeyRound,
    text: 'We never store passwords in plain text — all credentials are hashed with a modern, one-way algorithm before storage.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow={
        <>
          <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Legal
        </>
      }
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      badge={<PolicyVersionBadge docType="privacy" />}
    >
      {/* Your rights at a glance */}
      <Card className="mb-8 rounded-2xl border bg-card shadow-soft card-glow">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Your rights at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2">
            {RIGHTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* What we never do */}
      <div className="mb-8 rounded-2xl border bg-muted/30 p-5">
        <p className="mb-4 text-sm font-semibold">What we never do</p>
        <ul className="space-y-3">
          {NEVER_DO.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
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

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        For privacy requests, reach us via the{' '}
        <Link
          href="/contact"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          contact page
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
