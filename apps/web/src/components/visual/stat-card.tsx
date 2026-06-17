import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compact KPI card for dashboard headers. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'primary',
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'accent';
  className?: string;
}) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    accent: 'bg-accent/15 text-accent',
  } as const;

  return (
    <div
      className={cn(
        'card-glow rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn('flex h-9 w-9 items-center justify-center rounded-xl', accentMap[accent])}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
