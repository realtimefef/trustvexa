'use client';

/**
 * Currency display context.
 *
 * The `CurrencyToggle` component writes a `FIAT` cookie (USD / EUR / GBP).
 * This context reads that cookie on mount and exposes a `formatUsd(cents)`
 * helper that converts from USD cents to the selected display currency using
 * static approximation rates. Components that display money amounts import
 * `useCurrency()` instead of formatting values themselves.
 *
 * Note: these are static approximation rates for DISPLAY purposes only. All
 * ledger math remains in server-authoritative USD cents.
 */
import * as React from 'react';

export type FiatCurrency = 'USD' | 'EUR' | 'GBP';

interface Rate {
  symbol: string;
  rate: number;
  locale: string;
}

const RATES: Record<FiatCurrency, Rate> = {
  USD: { symbol: '$', rate: 1.0, locale: 'en-US' },
  EUR: { symbol: '€', rate: 0.92, locale: 'de-DE' },
  GBP: { symbol: '£', rate: 0.79, locale: 'en-GB' },
};

function readCurrencyCookie(): FiatCurrency {
  if (typeof document === 'undefined') return 'USD';
  const match = document.cookie.match(/(?:^|; )FIAT=([^;]*)/);
  const val = match?.[1];
  if (val === 'EUR' || val === 'GBP') return val;
  return 'USD';
}

interface CurrencyContextValue {
  currency: FiatCurrency;
  setCurrency: (c: FiatCurrency) => void;
  /** Format an amount given in USD cents into the active display currency. */
  formatUsd: (usdCents: number | string | bigint | null | undefined) => string;
  /** Format a raw coin amount string (e.g. "0.5000 ETH") — passed through unchanged. */
  formatCoin: (amount: string | null | undefined, coin: string) => string;
}

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = React.useState<FiatCurrency>('USD');

  React.useEffect(() => {
    setCurrencyState(readCurrencyCookie());

    // Re-read when the cookie changes (another tab may update it).
    const interval = setInterval(() => {
      const next = readCurrencyCookie();
      setCurrencyState((prev) => (prev !== next ? next : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = React.useCallback((c: FiatCurrency) => {
    document.cookie = `FIAT=${c}; path=/; max-age=31536000; SameSite=Lax`;
    setCurrencyState(c);
  }, []);

  const formatUsd = React.useCallback(
    (usdCents: number | string | bigint | null | undefined): string => {
      if (usdCents === null || usdCents === undefined) return '—';
      const cents = typeof usdCents === 'bigint' ? Number(usdCents) : Number(usdCents);
      if (Number.isNaN(cents)) return '—';
      const r = RATES[currency];
      const amount = (cents / 100) * r.rate;
      return new Intl.NumberFormat(r.locale, { style: 'currency', currency }).format(amount);
    },
    [currency],
  );

  const formatCoin = React.useCallback(
    (amount: string | null | undefined, coin: string): string => {
      if (!amount) return '—';
      return `${amount} ${coin}`;
    },
    [],
  );

  const value = React.useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, formatUsd, formatCoin }),
    [currency, setCurrency, formatUsd, formatCoin],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
