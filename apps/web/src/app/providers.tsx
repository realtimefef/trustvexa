'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { SocketProvider } from '@/lib/socket/socket-context';
import { ToastProvider } from '@/components/ui/toast';
import { CurrencyProvider } from '@/lib/currency-context';

// Client-side provider tree wired at the app root:
//  - next-themes  → dark/light/system theme (Requirement 49.2)
//  - TanStack Query → server-state caching/retries/background refresh
// next-intl's NextIntlClientProvider is wired in the root layout (server side).
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <CurrencyProvider>
              <ToastProvider>{children}</ToastProvider>
            </CurrencyProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
