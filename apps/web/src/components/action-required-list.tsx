'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ActionItem {
  id: string;
  dealId: string;
  label: string;
  blocking: boolean;
  type: string;
}

interface ActionRequiredListProps {
  actions: ActionItem[];
  className?: string;
}

export function ActionRequiredList({ actions, className }: ActionRequiredListProps) {
  const activeActions = actions || [];

  return (
    <Card className={`rounded-2xl border bg-card shadow-soft ${className}`}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4.5 w-4.5 text-primary" /> Action Center
        </CardTitle>
        <CardDescription>Deals waiting for your input, approval, or signature.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border/60">
        {activeActions.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
            <ShieldCheckIcon className="h-5 w-5 text-emerald-500" />
            <span>All caught up! No actions required.</span>
          </div>
        ) : (
          <ul className="divide-y">
            {activeActions.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {item.blocking ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400">
                        <AlertTriangle className="h-2.5 w-2.5" /> Blocking
                      </span>
                    ) : null}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Deal {item.dealId.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-normal">
                    {item.label}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold">
                  <Link href={`/deals/${item.dealId}`}>
                    Resolve <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    </svg>
  );
}
