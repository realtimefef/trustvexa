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
  // Make a freshly deployed service worker take over immediately instead of
  // waiting for every tab to close. Without this, browsers keep serving the
  // previously cached app shell after a deploy ("still shows old"). skipWaiting
  // + clientsClaim activate the new SW right away; reloadOnOnline refreshes
  // when connectivity returns.
  reloadOnOnline: true,
  cacheOnFrontEndNav: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(appRoot, '../..'),
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@trustvexa/shared'],

  /**
   * Proxy /api/v1/* → API service.
   *
   * WHY THIS IS REQUIRED:
   * The web app (trustvexa-web.onrender.com) and the API
   * (trustvexa-api.onrender.com) are on different domains. The API sets the
   * httpOnly refresh-token cookie (`tv_refresh`) scoped to its own domain.
   * The Next.js middleware — which runs on the web server — cannot read a
   * cookie belonging to the API domain, so it always sees "no token" and
   * redirects every authenticated user back to /login (infinite loop).
   *
   * By proxying all /api/v1/* requests through the Next.js server, the
   * Set-Cookie header from the API is forwarded to the browser with the web
   * domain, so the middleware can read it on subsequent requests.
   *
   * Environment variables needed on Render:
   *   API_BASE_URL           = https://trustvexa-api.onrender.com  (server-side)
   *   NEXT_PUBLIC_API_BASE_URL = (leave EMPTY or set to web origin) (client-side)
   */
  async rewrites() {
    const apiBase = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
    if (!apiBase) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBase}/api/v1/:path*`,
      },
      // Proxy Socket.IO traffic to the API service.
      //
      // WHY THIS IS REQUIRED:
      // In proxy mode (NEXT_PUBLIC_API_BASE_URL empty) the browser opens the
      // realtime connection against the SAME origin as the web app
      // (trustvexa-web.onrender.com/socket.io). Without this rewrite those
      // requests hit the Next.js server, which has no /socket.io handler, so
      // every Socket.IO request 404s and the realtime connection never
      // establishes — breaking ALL live updates (deals, chat, presence,
      // notifications) site-wide until a manual refresh.
      //
      // The web client uses the HTTP long-polling transport in proxy mode
      // (see socket-context.tsx), and polling is plain HTTP GET/POST that
      // proxies cleanly through this rewrite. WebSocket upgrades are NOT
      // proxied by Next rewrites, which is why the client deliberately sticks
      // to polling here.
      {
        source: '/socket.io/:path*',
        destination: `${apiBase}/socket.io/:path*`,
      },
    ];
  },
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
              // Next.js App Router injects inline hydration/streaming scripts
              // (self.__next_f pushes) and loads chunk bundles from 'self'.
              // Without a per-request nonce pipeline, 'strict-dynamic' would
              // block ALL scripts (including Next's own) and the app would never
              // hydrate. We allow 'self' + 'unsafe-inline' so the bundles run;
              // dev additionally needs 'unsafe-eval' for React Fast Refresh.
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''};`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
              `img-src 'self' data: https://*.googleusercontent.com ${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''};`,
              `connect-src 'self' ws: wss: ${process.env.NODE_ENV !== 'production' ? "http:" : ""} https:;`,
              // frame-ancestors in CSP supersedes X-Frame-Options in modern browsers. (Audit FIX-P2-6)
              "frame-ancestors 'none';",
              "frame-src 'self';",
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
