'use client';

import * as React from 'react';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrency, type FiatCurrency } from '@/lib/currency-context';

const CYCLE: FiatCurrency[] = ['USD', 'EUR', 'GBP'];

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();

  const toggleCurrency = () => {
    const idx = CYCLE.indexOf(currency);
    const next = CYCLE[(idx + 1) % CYCLE.length] ?? 'USD';
    setCurrency(next);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Display currency: ${currency}. Click to toggle.`}
      onClick={toggleCurrency}
      className="flex items-center gap-1.5 px-2.5 h-9"
    >
      <Coins className="h-4 w-4" aria-hidden />
      <span className="text-xs font-semibold uppercase">{currency}</span>
    </Button>
  );
}
