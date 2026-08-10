import type { Metadata, Viewport } from 'next';
import { Inter, Sora, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { CookieConsent } from '@/components/cookie-consent';
import { cn } from '@/lib/utils';
import { Providers } from './providers';
import { ExtensionGuard } from '@/components/extension-guard';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
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

// Canonical public origin. Setting metadataBase makes Next emit absolute
// canonical/OG URLs against the real domain so Google never indexes the
// *.onrender.com duplicate. Override with NEXT_PUBLIC_SITE_URL if needed.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trustvexa.com').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'TrustVexa',
  description:
    'Secure escrow infrastructure for freelancers, marketplaces, and B2B transactions. Milestone-based releases with neutral dispute mediation.',
  applicationName: 'TrustVexa',
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
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
        <ServiceWorkerRegister />
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
