'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { dealStatusLabel, dealStatusVariant } from '@/lib/deal-status';

interface StateBadgeProps {
  status: string;
  className?: string;
}

export function StateBadge({ status, className }: StateBadgeProps) {
  return (
    <Badge variant={dealStatusVariant(status)} className={className}>
      {dealStatusLabel(status)}
    </Badge>
  );
}
