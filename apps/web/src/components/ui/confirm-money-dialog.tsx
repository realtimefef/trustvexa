'use client';

import * as React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmMoneyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  amountText: string;
  isSubmitting?: boolean;
}

export function ConfirmMoneyDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  amountText,
  isSubmitting = false,
}: ConfirmMoneyDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md scale-95 animate-fade-up rounded-2xl border bg-card p-6 shadow-glow transition-all duration-300">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>

        <h3 className="font-display font-bold text-lg text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>

        {/* Highlighted Warning Box */}
        <div className="rounded-xl border border-amber-300/40 bg-amber-500/[0.03] p-4 mb-6">
          <div className="flex gap-2.5 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Action Amount</p>
              <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {amountText}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                This transaction is final and cannot be undone once signed on the blockchain.
                Double-check all details.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="gradient" size="sm" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Confirming…' : 'Yes, confirm transaction'}
          </Button>
        </div>
      </div>
    </div>
  );
}
