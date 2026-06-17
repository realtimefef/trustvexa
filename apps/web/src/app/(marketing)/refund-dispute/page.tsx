import type { Metadata } from 'next';
import Link from 'next/link';
import { FileCheck, Lock, Scale } from 'lucide-react';

import { LegalLayout } from '@/components/visual/legal-layout';

export const metadata: Metadata = {
  title: 'Refund & Dispute Policy | TrustVexa',
  description:
    'How disputes are raised and resolved, and when refunds or partial settlements apply.',
};

const LAST_UPDATED = 'June 2026';

const SECTIONS: ReadonlyArray<{ heading: string; body: ReadonlyArray<string> }> = [
  {
    heading: '1. Escrow protects both sides',
    body: [
      'Funds are held in escrow until the deal terms are met. This protects the buyer from paying for something they never receive, and the seller from delivering something they are never paid for.',
    ],
  },
  {
    heading: '2. Raising a dispute',
    body: [
      'If something goes wrong, either party can open a dispute from the deal. Opening a dispute pauses the normal flow and routes the deal to a neutral middleman for review.',
    ],
  },
  {
    heading: '3. Evidence & review',
    body: [
      'Both parties may submit evidence such as messages, screenshots, and delivery proof. The middleman reviews the agreed terms and the evidence, and may ask follow-up questions before deciding.',
    ],
  },
  {
    heading: '4. Possible outcomes',
    body: [
      'A dispute can be resolved by releasing the funds to the seller, refunding the buyer, or a partial settlement that splits the funds. The decision is recorded with the deal and is final for the purpose of releasing escrowed funds.',
    ],
  },
  {
    heading: '5. Fees on disputed deals',
    body: [
      'Platform and settlement fees follow the published fee schedule and the final decision. Network (gas) costs already incurred on-chain cannot be reversed.',
    ],
  },
  {
    heading: '6. Cancellations before funding',
    body: [
      'A deal that has not yet been funded can be cancelled without a dispute, and no platform fee applies because no funds were held.',
    ],
  },
];

export default function RefundDisputePage() {
  return (
    <LegalLayout
      eyebrow={
        <>
          <Scale className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Legal
        </>
      }
      title="Refund & Dispute Policy"
      lastUpdated={LAST_UPDATED}
    >
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

      {/* Quick reference */}
      <div className="mt-12 space-y-4">
        <h2 className="font-display text-lg font-semibold">Quick reference</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Escrow frozen on dispute</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The moment a dispute is opened the escrowed funds are frozen. Neither party can
              release, cancel, or redirect them until the middleman issues a ruling.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Evidence window</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Both sides have a fair window to submit their case. Accepted evidence includes chat
              logs, screenshots, delivery proof, and on-chain transaction records.
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-display font-semibold">Decision is final</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The middleman's decision is final for the purpose of releasing escrowed funds. It is
              recorded immutably against the deal record.
            </p>
          </div>
        </div>
      </div>

      {/* Dispute timeline */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-semibold">Dispute timeline</h2>
        <p className="text-sm text-muted-foreground">
          Most disputes are resolved within a few business days. Complex cases requiring deeper
          evidence review may take up to 7 days.
        </p>
        <ol className="space-y-3">
          {[
            {
              step: '1',
              label: 'Day 1 — dispute opened',
              detail:
                'Either party triggers a dispute from the deal dashboard. Funds are immediately frozen and both sides are notified.',
            },
            {
              step: '2',
              label: 'Evidence submission',
              detail:
                'Both buyer and seller upload their supporting evidence: chat exports, delivery screenshots, confirmation receipts, and any other relevant proof.',
            },
            {
              step: '3',
              label: 'Middleman review (up to 7 days for complex cases)',
              detail:
                'A neutral middleman reads the agreed deal terms and all submitted evidence. They may ask clarifying questions to either party before deciding.',
            },
            {
              step: '4',
              label: 'Decision issued',
              detail:
                'The middleman records their ruling: full release to seller, full refund to buyer, or a partial split. Both parties are notified immediately.',
            },
            {
              step: '5',
              label: 'Funds released or refunded',
              detail:
                'The on-chain settlement is executed in line with the ruling. Gas costs already incurred cannot be reversed.',
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-4 rounded-2xl border bg-muted/30 p-5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {item.step}
              </span>
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* What makes a strong case */}
      <div className="mt-10 space-y-4">
        <h2 className="font-display text-lg font-semibold">What makes a strong case</h2>
        <p className="text-sm text-muted-foreground">
          The clearer your evidence is, the faster a ruling can be made. These four types of proof
          carry the most weight in any dispute review.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: 'Agreed written terms',
              body: 'A deal with clearly written terms agreed by both parties at the outset leaves no ambiguity about what was promised. Vague or verbal-only agreements are harder to adjudicate.',
            },
            {
              title: 'Delivery screenshots',
              body: 'Visual proof of what was delivered — or not delivered — gives the middleman objective evidence to work with. Timestamped screenshots are stronger than descriptions.',
            },
            {
              title: 'Timestamped chat',
              body: 'Conversation exports showing the negotiation, any delivery confirmations, and any complaints raised in real time provide a reliable chronology of events.',
            },
            {
              title: 'On-chain transaction proof',
              body: 'Blockchain transaction hashes, wallet addresses, and block explorer links confirm what moved on-chain and when — this type of evidence is tamper-proof.',
            },
          ].map((tip) => (
            <div key={tip.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <p className="font-display font-semibold">{tip.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 border-t pt-6 text-sm text-muted-foreground">
        See how a deal flows end to end on{' '}
        <Link
          href="/how-it-works"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          How it works
        </Link>
        , or review the{' '}
        <Link
          href="/fees"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          fee schedule
        </Link>
        .
      </p>
    </LegalLayout>
  );
}
