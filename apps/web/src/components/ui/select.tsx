'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ── Root / context ────────────────────────────────────────────────────────────

interface SelectContextValue {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
}
const SelectContext = React.createContext<SelectContextValue | null>(null);
function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error('Select components must be used inside <Select>');
  return ctx;
}

interface SelectProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Select({ value, onValueChange, children, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen: disabled ? () => {} : setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}
export function SelectTrigger({ className, children }: SelectTriggerProps) {
  const { open, setOpen } = useSelect();
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
    </button>
  );
}

// ── Value ─────────────────────────────────────────────────────────────────────

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useSelect();
  return <span>{value || placeholder || ''}</span>;
}

// ── Content ───────────────────────────────────────────────────────────────────

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open, setOpen } = useSelect();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // Only close on clicks OUTSIDE the menu — clicking an item must register
      // its selection first (the item's own onClick closes the menu).
      if (ref.current && ref.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', handler, { capture: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, [open, setOpen]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-1 max-h-60 min-w-full overflow-y-auto rounded-md border bg-popover shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}
export function SelectItem({ value, children, className }: SelectItemProps) {
  const { value: current, onValueChange, setOpen } = useSelect();
  return (
    <button
      type="button"
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        current === value && 'bg-accent/60 font-medium',
        className,
      )}
      onClick={() => { onValueChange(value); setOpen(false); }}
    >
      {children}
      {current === value && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-auto"><path d="M20 6 9 17l-5-5"/></svg>
      )}
    </button>
  );
}
