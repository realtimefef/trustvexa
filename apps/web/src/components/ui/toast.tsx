'use client';

import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toast: (description: string, type?: ToastType, title?: string) => void;
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (description: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        id,
        description,
        type,
        duration: 4000,
        ...(title ? { title } : {}),
      };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast, toasts, dismiss }), [toast, toasts, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function Toaster() {
  const ctx = React.useContext(ToastContext);
  if (!ctx || ctx.toasts.length === 0) return null;

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-destructive" />,
    info: <Info className="h-5 w-5 text-primary" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  };

  const borderStyles: Record<ToastType, string> = {
    success: 'border-emerald-500/25 bg-emerald-500/[0.04]',
    error: 'border-destructive/25 bg-destructive/[0.04]',
    info: 'border-primary/25 bg-primary/[0.04]',
    warning: 'border-amber-500/25 bg-amber-500/[0.04]',
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm"
      role="region"
      aria-live="polite"
    >
      {ctx.toasts.map((t) => (
        <div
          key={t.id}
          className={`flex gap-3 items-start p-4 rounded-xl border bg-card/90 backdrop-blur-xl shadow-lg transition-all duration-300 animate-fade-up ${borderStyles[t.type]}`}
        >
          <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 space-y-1">
            {t.title ? <p className="text-sm font-semibold text-foreground">{t.title}</p> : null}
            <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
          </div>
          <button
            onClick={() => ctx.dismiss(t.id)}
            className="text-muted-foreground/50 hover:text-foreground shrink-0 rounded-md transition-colors"
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
