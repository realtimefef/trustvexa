'use client';

import * as React from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocket } from '@/lib/socket/socket-context';

interface ConfirmationCounterProps {
  dealId: string;
  initialConfirmations?: number;
  requiredConfirmations: number;
  className?: string;
  onConfirmed?: () => void;
}

export function ConfirmationCounter({
  dealId,
  initialConfirmations = 0,
  requiredConfirmations,
  className,
  onConfirmed,
}: ConfirmationCounterProps) {
  const { socket } = useSocket();
  const [confirmations, setConfirmations] = React.useState(initialConfirmations);

  React.useEffect(() => {
    setConfirmations(initialConfirmations);
  }, [initialConfirmations]);

  React.useEffect(() => {
    if (!socket) return;

    const handleTick = (data: { dealId: string; confirmations: number }) => {
      if (data.dealId === dealId) {
        setConfirmations(data.confirmations);
        if (data.confirmations >= requiredConfirmations) {
          onConfirmed?.();
        }
      }
    };

    socket.on('confirmation:tick', handleTick);
    socket.on('payment:update', (data: { dealId: string; confirmations: number }) => {
      if (data.dealId === dealId && typeof data.confirmations === 'number') {
        setConfirmations(data.confirmations);
        if (data.confirmations >= requiredConfirmations) {
          onConfirmed?.();
        }
      }
    });

    return () => {
      socket.off('confirmation:tick', handleTick);
    };
  }, [socket, dealId, requiredConfirmations, onConfirmed]);

  const pct = Math.min(100, Math.max(0, (confirmations / requiredConfirmations) * 100));
  const isComplete = confirmations >= requiredConfirmations;

  return (
    <div className={cn('rounded-2xl border bg-card p-5 shadow-soft space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-success animate-pulse" />
          ) : (
            <Loader2 className="h-4.5 w-4.5 text-primary animate-spin" />
          )}
          <span className="text-xs font-semibold text-foreground">
            {isComplete ? 'Deposit confirmed' : 'Awaiting confirmation…'}
          </span>
        </div>
        <span className="font-mono text-xs font-bold text-primary">
          {confirmations} / {requiredConfirmations} Blocks
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-brand-gradient transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground leading-normal">
        {isComplete
          ? 'On-chain transaction completed and credited. The deal is now Funded.'
          : 'Once your transaction is broadcast to the network, we count blocks to confirm the deposit. Do not close this page.'}
      </p>
    </div>
  );
}
