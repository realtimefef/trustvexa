import type { Metadata, Viewport } from 'next';
import { Inter, Sora, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { CookieConsent } from '@/components/cookie-consent';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import { ExtensionGuard } from '@/components/extension-guard';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TrustVexa',
  description: 'Private, secure, crypto-only escrow platform.',
  applicationName: 'TrustVexa',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'TrustVexa',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
};

// Root layout wires the app-wide provider tree: next-intl (i18n) on the server,
// then next-themes + TanStack Query on the client. (Requirements 44.4, 49.1–49.3)
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(inter.variable, sora.variable, jetbrainsMono.variable)}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <ExtensionGuard />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <CookieConsent />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
