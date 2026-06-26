import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpCircle, LifeBuoy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHero } from '@/components/visual/page-hero';
import { FaqExplorer, type FaqEntry } from '@/components/visual/faq-explorer';

export const metadata: Metadata = {
  title: 'FAQ | TrustVexa',
  description:
    'Answers to common questions about crypto escrow, funding, fees, the fee split, disputes, security, and your account.',
};

const FAQ: ReadonlyArray<FaqEntry> = [
  // Getting started
  {
    category: 'Getting started',
    q: 'What is TrustVexa?',
    a: 'TrustVexa is a crypto-only escrow service for safely trading digital products and online accounts. Funds are held in escrow until both sides meet the agreed terms, with a neutral middleman ready to mediate.',
  },
  {
    category: 'Getting started',
    q: 'How do I create a deal?',
    a: 'From your dashboard, choose "New deal", set the amount, coin, network, fee payer, and terms, then invite your counterparty with a single-use link and a verification code.',
  },
  {
    category: 'Getting started',
    q: 'What deal sizes are supported?',
    a: 'Deals range from $400 to $50,000, settled in your chosen coin. The platform fee rate gets cheaper as the deal size grows.',
  },
  {
    category: 'Getting started',
    q: 'Do both parties need an account?',
    a: 'Yes. The counterparty joins through the invite link and creates or signs into their account before the deal can proceed.',
  },
  // Funding & payments
  {
    category: 'Funding & payments',
    q: 'How does the buyer fund a deal?',
    a: 'The buyer sends crypto to a unique escrow address for the chosen network. The platform waits for the required on-chain confirmation depth before the deal advances.',
  },
  {
    category: 'Funding & payments',
    q: 'Which coins and networks are supported?',
    a: 'USDT, ETH, BNB, SOL, and TRX across Ethereum, BNB Chain, TRON, and Solana. USDT settles on all four chains; the native coins settle on their own chain.',
  },
  {
    category: 'Funding & payments',
    q: 'When are funds released to the seller?',
    a: 'Once the buyer approves delivery, or when the inspection window lapses without a dispute under the agreed terms, the payout is released to the seller.',
  },
  {
    category: 'Funding & payments',
    q: 'What happens if I send the wrong amount or wrong network?',
    a: 'Always send the exact asset on the exact network shown. Blockchain transactions are irreversible; sending the wrong asset or chain can result in loss that the platform cannot recover.',
  },
  // Fees & split
  {
    category: 'Fees & split',
    q: 'What are the fees?',
    a: 'A sliding-scale platform fee from 5% down to 1.35% with a $30 minimum, plus a 0.5% seller settlement fee. On-chain network gas is passed through at cost and shown at funding.',
  },
  {
    category: 'Fees & split',
    q: 'Who pays the platform fee?',
    a: 'When you create a deal you choose the fee payer: the buyer, the seller, or a split. The seller settlement fee is always borne by the seller.',
  },
  {
    category: 'Fees & split',
    q: 'Is the split always 50/50?',
    a: "No. The split is whatever the buyer and seller agree to — 50/50, 70/30, or any ratio. You set the buyer's share when creating the deal, and the seller covers the exact remainder. Use the fee calculator to preview any ratio.",
  },
  {
    category: 'Fees & split',
    q: 'Where can I estimate fees before committing?',
    a: 'Use the fee calculator on the Fees page or in your dashboard. It shows exactly what the buyer sends and the seller receives, from both points of view, for any split ratio.',
  },
  // Disputes
  {
    category: 'Disputes',
    q: 'What happens if there is a dispute?',
    a: 'Either side can open a dispute from the deal. A neutral middleman reviews the evidence, applies the written terms, and issues a final decision — release, refund, or a partial settlement.',
  },
  {
    category: 'Disputes',
    q: 'How long does mediation take?',
    a: 'It depends on the complexity and how quickly both sides submit evidence. The middleman may ask follow-up questions before deciding.',
  },
  {
    category: 'Disputes',
    q: 'Can I cancel a deal before it is funded?',
    a: 'Yes. A deal that has not been funded can be cancelled without a dispute, and no platform fee applies because no funds were held.',
  },
  // Security
  {
    category: 'Security',
    q: 'Do I need to share personal information to use TrustVexa?',
    a: 'No. TrustVexa is designed so you can secure yourself without exposing private data. Your real name, address, and ID are never shared with your counterparty — personal details stay encrypted and accessible only on a need-to-know basis. Only the deal terms and a one-time verification code are exchanged between parties.',
  },
  {
    category: 'Security',
    q: 'How are my funds protected?',
    a: 'Funds are confirmed on-chain and held in escrow until the deal terms are met. Money never moves on an unverified instruction, and every movement is recorded in a double-entry ledger.',
  },
  {
    category: 'Security',
    q: 'How is my data protected?',
    a: 'Sensitive deal details are encrypted at rest, access is scoped on a need-to-know basis, and the presence of a middleman on a deal is kept private to both sides.',
  },
  {
    category: 'Security',
    q: 'How do I report a vulnerability?',
    a: "Email support@trustvexa.com with steps to reproduce. Please report privately and do not access other users' data or disclose publicly until we have resolved the issue.",
  },
  // Account
  {
    category: 'Account',
    q: 'How do I enable two-factor authentication?',
    a: 'Open Settings → Security and toggle two-factor authentication. We recommend keeping login alerts and step-up confirmation enabled too.',
  },
  {
    category: 'Account',
    q: 'Can I change the fee split after a deal is funded?',
    a: 'No. Once a deal is funded, the financial breakdown — including the split — is locked as an immutable snapshot on the deal so it cannot shift later.',
  },
  // Timing & SLA
  {
    category: 'Timing & SLA',
    q: 'How long does payout take?',
    a: 'In the vast majority of cases, the payout broadcast happens within one hour of buyer approval. For complex deals or those with additional verification steps the process can take up to 24 hours. If a deal enters a disputed state, the middleman will review the evidence and issue a decision; disputed payouts may take up to 7 days from when the dispute is opened.',
  },
  {
    category: 'Timing & SLA',
    q: 'What is the 3-day rule?',
    a: 'Once a deal is funded and both parties have verified each other, the seller has 3 calendar days to complete delivery of the agreed goods or services. If the seller has not fulfilled the terms within that window, the deal auto-cancels and the held funds are fully refunded to the buyer. This rule protects buyers from indefinite waits and incentivises sellers to complete promptly.',
  },
  {
    category: 'Timing & SLA',
    q: 'What is the inspection window?',
    a: 'After the seller marks a deal as delivered, the buyer enters an inspection window — a period both parties agree to before the deal is funded. The buyer must either approve delivery or raise a dispute before this window closes. If the window lapses without any action, the funds are automatically released to the seller. This keeps deals moving while giving the buyer fair time to verify.',
  },
  // Trust & verification
  {
    category: 'Trust & verification',
    q: 'What is the 48-digit verification code?',
    a: 'When a deal is initiated, the buyer generates a 48-digit code and shares it with the seller through an out-of-band channel of their choosing (a message app, email, phone call, etc.). The seller enters this code on their end. Both sides seeing and confirming the same code proves they are talking to the same person they made the deal with and that neither is being impersonated.',
  },
  {
    category: 'Trust & verification',
    q: 'How does the trust level system work?',
    a: 'Every account starts in good standing. Your trust level is a rolling score influenced by your deal history. Completing deals on time and without disputes earns positive signals. Missing deadlines, having disputed deals decided against you, or cancelling funded deals drops your score. A lower trust level may limit deal sizes or require additional verification steps. Consistent good behaviour over time allows your level to recover.',
  },
  {
    category: 'Trust & verification',
    q: "Can I see a counterparty's history before I deal with them?",
    a: "Yes. When you view a deal invite you can see the counterparty's trust badge, the total number of completed deals, and their average rating left by past partners. For privacy, their email address and full name are never shown to you. This gives you meaningful signal without exposing personal information.",
  },
  // Deals & trading
  {
    category: 'Deals & trading',
    q: 'What can I trade on TrustVexa?',
    a: 'TrustVexa is designed for digital products and online account sales — things like software licences, digital art, domain names, social media accounts, and in-game items, provided they are legal and not on our Prohibited items list. Physical goods, regulated financial instruments, and any item banned by our prohibited-items policy cannot be traded. If you are unsure whether an item is permitted, check the Prohibited items page before proceeding.',
  },
  {
    category: 'Deals & trading',
    q: 'Can I duplicate a past deal?',
    a: 'Yes. From your deal history you can clone the settings of a completed deal — the amount, coin, network, fee split, and terms — into a new draft. Only the deal configuration is cloned; the counterparty invitation is never reused. You will invite the other party fresh each time, which ensures the verification code flow is always conducted anew for security.',
  },
  {
    category: 'Deals & trading',
    q: 'What happens if a deal expires without being funded?',
    a: "If a deal invite is not acted on within the expiry window, or if the deal is funded but the 3-day delivery window lapses without completion, the deal auto-cancels. For auto-cancels on funded deals, any held funds are returned in full to the buyer's registered withdrawal address. No platform fee is charged on auto-cancelled deals.",
  },
  // Wallet & crypto
  {
    category: 'Wallet & crypto',
    q: 'Do I need a specific wallet to use TrustVexa?',
    a: 'No specific wallet is required. Any wallet that can send and receive the chosen coin on the chosen network will work — whether that is a hardware wallet, a browser-extension wallet, a mobile wallet, or an exchange withdrawal. You simply send to the escrow address shown in the deal and receive your payout to the withdrawal address you register in your account settings.',
  },
  {
    category: 'Wallet & crypto',
    q: 'What is address-poisoning protection?',
    a: 'Address poisoning is an attack where a bad actor sends a tiny "dust" transaction to your wallet from an address that looks nearly identical to one you regularly use, hoping you will accidentally copy it next time. TrustVexa\'s address-poisoning protection ensures that look-alike addresses from dust transactions are never auto-filled in the withdrawal address field. Your registered payout address is always taken from your verified account settings, not from your on-chain transaction history.',
  },
  {
    category: 'Wallet & crypto',
    q: 'How are payouts processed?',
    a: "After buyer approval (or automatic release at the end of the inspection window), a middleman performs a final review to confirm there are no outstanding disputes or compliance flags. Once cleared, the payout transaction is broadcast on-chain to the seller's registered withdrawal address. The deal record updates with the transaction hash so both parties can independently track the transfer to completion on a block explorer.",
  },
];

const POPULAR_CATEGORIES = [
  'Getting started',
  'Funding & payments',
  'Fees & split',
  'Trust & verification',
  'Timing & SLA',
  'Wallet & crypto',
  'Deals & trading',
  'Disputes',
  'Security',
  'Account',
] as const;

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow={
          <>
            <HelpCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Help center
          </>
        }
        title="Frequently asked questions"
        subtitle="Search, filter by topic, and find clear answers about escrow, funding, fees, the configurable split, disputes, and security."
      />

      <section className="section">
        <div className="container max-w-4xl">
          {/* Stat band */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-muted/30 px-6 py-4">
            <p className="text-sm font-medium text-muted-foreground">
              <span className="text-foreground font-semibold">{FAQ.length}+ questions</span> ·{' '}
              <span className="text-foreground font-semibold">10 categories</span> ·{' '}
              <span className="text-foreground font-semibold">Updated June 2026</span>
            </p>
          </div>

          {/* Popular topic badges */}
          <div className="mb-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Popular topics
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="cursor-pointer rounded-full px-3 py-1 text-xs transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <FaqExplorer items={FAQ} />

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-primary/[0.03] p-6">
            <div className="flex items-center gap-3">
              <LifeBuoy className="h-6 w-6 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Didn&apos;t find your answer?</p>
                <p className="text-sm text-muted-foreground">Our team is happy to help.</p>
              </div>
            </div>
            <Button asChild variant="gradient">
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
