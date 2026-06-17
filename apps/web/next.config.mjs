import createNextIntlPlugin from 'next-intl/plugin';
import withPWAInit from '@ducanh2912/next-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

// next-intl: point the plugin at the request config (no URL-based i18n routing;
// locale is resolved server-side from a cookie/Accept-Language, see src/i18n/request.ts).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// PWA: service worker + offline shell (Requirement 49.3). Disabled in dev to avoid
// caching churn while developing.
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(appRoot, '../..'),
  // The dedicated root `pnpm lint` command remains the authoritative lint gate.
  eslint: { ignoreDuringBuilds: true },
  // @trustvexa/shared is a workspace package shipped as TS-compiled JS; transpile it
  // so client/server share the same Zod schemas and types.
  transpilePackages: ['@trustvexa/shared'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              // unsafe-inline kept only in development (HMR). Production uses
              // strict-dynamic + nonce (injected by Next.js) so inline scripts
              // are rejected by default. (Audit FIX-P2-6)
              `script-src 'self' ${process.env.NODE_ENV !== 'production' ? "'unsafe-inline' 'unsafe-eval'" : "'strict-dynamic'"} https://hcaptcha.com https://*.hcaptcha.com;`,
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://fonts.googleapis.com;",
              `img-src 'self' data: https://*.googleusercontent.com https://hcaptcha.com https://*.hcaptcha.com ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''};`,
              `connect-src 'self' ws: wss: ${process.env.NODE_ENV !== 'production' ? "http:" : ""} https: https://hcaptcha.com https://*.hcaptcha.com;`,
              // frame-ancestors in CSP supersedes X-Frame-Options in modern browsers. (Audit FIX-P2-6)
              "frame-ancestors 'none';",
              "frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com;",
              "font-src 'self' https://fonts.gstatic.com;",
              "object-src 'none';",
              "base-uri 'self';",
              "report-uri /api/csp-report;",
            ].filter(Boolean).join(' '),
          },
        ],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
