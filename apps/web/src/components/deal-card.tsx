'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { StateBadge } from '@/components/ui/state-badge';
import { formatUsdCents } from '@/lib/fees';

interface DealCardProps {
  id: string;
  status: string;
  role: string;
  coin: string;
  network: string;
  dealAmountCents: string;
  createdAt: string;
}

export function DealCard({
  id,
  status,
  role,
  coin,
  network,
  dealAmountCents,
  createdAt,
}: DealCardProps) {
  const amount = Number(dealAmountCents);
  const formattedAmount = Number.isFinite(amount) ? formatUsdCents(amount) : '$0.00';
  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="rounded-2xl border bg-card hover:shadow-glow transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <span className="font-mono text-xs text-muted-foreground">ID {id.slice(0, 8)}</span>
        <StateBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formattedAmount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {coin} · {network}
          </p>
        </div>

        <div className="flex justify-between items-center text-xs border-t pt-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Role:</span>
            <span className="font-semibold capitalize text-foreground">{role}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Link
          href={`/deals/${id}`}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-4 py-2.5 text-xs font-semibold text-primary transition-all"
        >
          View deal details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}
