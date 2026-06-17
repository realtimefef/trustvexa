'use client';

import * as React from 'react';
import { Landmark, ArrowUpRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface PaymentInstructionsProps {
  coin: string;
  network: string;
  className?: string;
}

export function PaymentInstructions({ coin, network, className }: PaymentInstructionsProps) {
  const steps = [
    {
      icon: Landmark,
      title: 'Send from your wallet',
      description: `Initiate a transfer of the exact amount of ${coin} from your personal wallet or exchange account.`,
    },
    {
      icon: ArrowUpRight,
      title: `Use ${network} network only`,
      description: `Ensure you specify the correct network. Sending tokens via the wrong network will result in permanent loss of funds.`,
    },
    {
      icon: ShieldCheck,
      title: 'Verify domain and address',
      description:
        'Check that you are on trustvexa.com and verify the escrow address matches. We never ask for seed phrases.',
    },
  ];

  return (
    <div
      className={`space-y-4 rounded-2xl border bg-card/60 p-6 shadow-soft backdrop-blur-xl ${className}`}
    >
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <HelpCircle className="h-4.5 w-4.5 text-primary" /> How to pay
      </h3>

      <ol className="divide-y">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <li key={idx} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <StepIcon className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">
                  Step {idx + 1}: {step.title}
                </p>
                <p className="text-xs text-muted-foreground leading-normal">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
