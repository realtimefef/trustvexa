'use client';

import * as React from 'react';
import { FileEdit, Wallet, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealTimelineProps {
  status: string;
  className?: string;
}

interface Step {
  key: string;
  label: string;
  icon: typeof FileEdit;
  states: string[];
}

const STEPS: Step[] = [
  { key: 'created', label: 'Created', icon: FileEdit, states: ['Created'] },
  { key: 'funded', label: 'Funded', icon: Wallet, states: ['Funded'] },
  { key: 'delivered', label: 'Delivered', icon: Truck, states: ['Delivered'] },
  {
    key: 'settled',
    label: 'Settled',
    icon: CheckCircle2,
    states: ['Released', 'Refunded', 'PartiallySettled'],
  },
];

export function DealTimeline({ status, className }: DealTimelineProps) {
  // Find index of current step
  const currentStepIndex = STEPS.findIndex((step) => step.states.includes(status));
  const isDisputed = status === 'Disputed';
  const isCancelled = status === 'Cancelled';
  const isExpired = status === 'Expired';

  return (
    <div className={cn('w-full py-4', className)}>
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border/40" />

        {/* Progress filler line */}
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-brand-gradient transition-all duration-500"
          style={{
            width: `${currentStepIndex >= 0 ? (currentStepIndex / (STEPS.length - 1)) * 100 : 0}%`,
          }}
        />

        {/* Timeline nodes */}
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStepIndex || currentStepIndex === STEPS.length - 1;
          const isCurrent = idx === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300',
                  isCompleted
                    ? 'bg-brand-gradient text-white border-transparent shadow-glow'
                    : isCurrent
                      ? 'bg-card text-primary border-primary ring-2 ring-primary/20 shadow-glow'
                      : 'bg-muted text-muted-foreground border-border/60',
                )}
              >
                <StepIcon className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  'absolute top-12 whitespace-nowrap text-xs font-semibold',
                  isCurrent ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Exception Banners (Disputed, Cancelled, Expired) */}
      {(isDisputed || isCancelled || isExpired) && (
        <div
          className={cn(
            'mt-16 flex items-start gap-2.5 rounded-xl border p-4 text-sm leading-relaxed animate-fade-up',
            isDisputed
              ? 'border-red-500/30 bg-red-500/[0.03] text-red-600 dark:text-red-400'
              : 'border-amber-500/30 bg-amber-500/[0.03] text-amber-600 dark:text-amber-400',
          )}
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold capitalize">Deal {status}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDisputed
                ? 'This deal is currently flagged as disputed. Funds are held in escrow until a mediator finishes reviewing the evidence from both sides.'
                : isCancelled
                  ? 'This deal was mutually cancelled by the buyer and seller. Funds have been returned.'
                  : 'This deal expired without receiving funding inside the required window.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
