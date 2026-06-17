'use client';

import * as React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  level: number;
  className?: string;
}

export function TrustBadge({ level, className }: TrustBadgeProps) {
  // Determine badge styling based on graduated trust level (0 - 4+)
  let colorClass = 'text-muted-foreground bg-muted/20 border-border/40';
  let label = 'Unverified (Level 0)';
  let Icon = Shield;

  if (level === 1) {
    colorClass = 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-500';
    label = 'Good Standing (Level 1)';
    Icon = ShieldCheck;
  } else if (level === 2) {
    colorClass = 'text-blue-600 bg-blue-500/10 border-blue-500/20 dark:text-blue-400';
    label = 'Verified (Level 2)';
    Icon = ShieldCheck;
  } else if (level === 3) {
    colorClass = 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400';
    label = 'Trusted (Level 3)';
    Icon = ShieldCheck;
  } else if (level >= 4) {
    colorClass =
      'text-violet-600 bg-violet-500/10 border-violet-500/20 dark:text-violet-400 font-bold';
    label = 'Elite VIP (Level 4+)';
    Icon = ShieldCheck;
  } else if (level < 0) {
    colorClass = 'text-destructive bg-destructive/10 border-destructive/20';
    label = 'Restricted';
    Icon = ShieldAlert;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold select-none backdrop-blur-xl',
        colorClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
