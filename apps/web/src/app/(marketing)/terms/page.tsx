import type { Metadata } from 'next';
import Link from 'next/link';
import { ScrollText, Bitcoin, ShieldCheck, Scale, Hash } from 'lucide-react';

import { LegalLayout } from '@/components/visual/legal-layout';
import { PolicyVersionBadge } from '@/components/policy-version-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Terms of Service | TrustVexa',
  description: 'The terms that govern your use of the TrustVexa crypto escrow service.',
};

const LAST_UPDATED = 'June 2026';

const SECTIONS: ReadonlyArray<{ heading: string; body: ReadonlyArray<string> }> = [
  {
    heading: '1. Agreement to these terms',
    body: [
      'By creating an account or using TrustVexa (the "Service"), you agree to these Terms of Service. If you do not agree, do not use the Service. You must be at least 18 years old and legally able to enter into contracts.',
    ],
  },
  {
    heading: '2. What TrustVexa does',
    body: [
      'TrustVexa provides a crypto-only escrow service for trading digital products and online accounts. We hold funds in escrow while a buyer and seller complete a transaction, and we may provide a neutral middleman to mediate disputes.',
      'TrustVexa is not a bank, money transmitter offering deposit accounts, broker, or investment service. Funds held in escrow are held for the purpose of settling a specific deal and are not deposits.',
    ],
  },
  {
    heading: '3. Eligibility & accounts',
    body: [
      'You are responsible for the accuracy of your account information and for keeping your credentials and two-factor methods secure. You are responsible for all activity under your account.',
    ],
  },
  {
    heading: '4. Deals & escrow',
    body: [
      'A deal is governed by the written terms both parties accept before funding. Once the buyer funds the escrow address and the funds are confirmed on-chain, the deal proceeds according to those terms.',
      'All amounts are computed server-side in the smallest unit of the relevant currency and recorded in a double-entry ledger. Released funds are paid to the seller minus the applicable platform and settlement fees.',
    ],
  },
  {
    heading: '5. Fees',
    body: [
      'Fees are disclosed before you commit to a deal and follow the published schedule on our Fees page, including the platform fee, a minimum fee, a settlement fee, and pass-through network (gas) costs. By proceeding with a deal you agree to the fees shown for that deal.',
    ],
  },
  {
    heading: '6. Prohibited items & conduct',
    body: [
      'You may not use the Service to trade banned items or to engage in unlawful, fraudulent, or abusive conduct. Prohibited and restricted categories are listed on our Prohibited items page. We may screen, hold, or cancel deals that violate these rules and report unlawful activity to authorities.',
    ],
  },
  {
    heading: '7. Disputes & mediation',
    body: [
      "If a dispute arises, either party may open a dispute. A neutral middleman will review the submitted evidence and the agreed terms and issue a final decision, which may be a release, a refund, or a partial settlement. You agree that the middleman's decision within the Service is final for the purpose of releasing escrowed funds.",
    ],
  },
  {
    heading: '8. Crypto & network risk',
    body: [
      'Blockchain transactions are irreversible and subject to network congestion, fees, and price volatility. You are responsible for sending the correct asset on the correct network to the correct address. TrustVexa is not liable for losses caused by user error, third-party wallets, or network conditions outside our control.',
    ],
  },
  {
    heading: '9. Limitation of liability',
    body: [
      'To the maximum extent permitted by law, TrustVexa is provided "as is" without warranties of any kind, and our aggregate liability for any claim is limited to the fees we earned on the specific deal giving rise to the claim.',
    ],
  },
  {
    heading: '10. Changes to these terms',
    body: [
      'We may update these terms from time to time. Material changes will be communicated through the Service. Continued use after an update means you accept the revised terms.',
    ],
  },
  {
    heading: '11. Governing law',
    body: [
      'These Terms of Service and any dispute arising out of or in connection with them — including disputes about their existence, validity, or termination — are governed by and construed in accordance with the laws of the State of Delaware, United States of America, without regard to its conflict-of-law principles.',
      'You agree that any legal action or proceeding relating to the Service that is not resolved through the in-platform dispute process will be brought exclusively in the state or federal courts located in Delaware. Both parties submit to the personal jurisdiction of those courts for this purpose.',
    ],
  },
  {
    heading: '12. Contact',
    body: [
      'If you have questions about these Terms of Service, need to report a potential violation, or have a legal inquiry relating to the Service, please reach us through the contact page. We aim to respond to all legal queries within five business days.',
      'For security disclosures, use the dedicated security contact described in our Trust & Security Center rather than the general contact form.',
    ],
  },
];

const ALL_HEADINGS = SECTIONS.map((s) => s.heading);

const KEY_POINTS = [
  {
    icon: Bitcoin,
    title: 'Crypto-only, no bank',
    description:
      'All deals settle exclusively in cryptocurrency. TrustVexa is not a bank and holds no deposit accounts.',
  },
  {
    icon: Hash,
    title: '$400–$50,000 deal range',
    description:
      'The minimum deal size is $400 and the maximum is $50,000, with sliding-scale fees that decrease as size grows.',
  },
  {
    icon: Scale,
    title: 'Middleman-mediated disputes',
    description:
      'A neutral middleman reviews evidence and issues a binding decision on any deal that enters a formal dispute.',
  },
  {
    icon: ShieldCheck,
    title: 'Delaware governing law',
    description:
      'These terms are governed by the laws of Delaware, USA. Unresolved legal matters are handled in Delaware courts.',
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow={
        <>
          <ScrollText className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Legal
        </>
      }
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      badge={<PolicyVersionBadge docType="terms" />}
    >
      {/* Key points summary card */}
      <Card className="mb-8 rounded-2xl border bg-card shadow-soft card-glow">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Key points at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2">
            {KEY_POINTS.map(({ icon: Icon, title, description }) => (
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

      {/* Table of contents */}
      <nav aria-label="Table of contents" className="mb-8 rounded-2xl border bg-muted/30 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Table of contents
        </p>
        <ol className="space-y-1">
          {ALL_HEADINGS.map((heading) => (
            <li key={heading}>
              <a
                href={`#${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section
            key={section.heading}
            id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
            className="space-y-2 scroll-mt-20"
          >
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
        Questions about these terms? Visit our{' '}
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
