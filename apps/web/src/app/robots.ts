import type { MetadataRoute } from 'next';

// Public origin used to build the absolute sitemap URL. Falls back to the
// production domain when the env var is not set (matches sitemap.ts).
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trustvexa.com').replace(/\/$/, '');

// Generates /robots.txt. Public marketing pages are crawlable; the operator
// console, the auth-gated app sections, and the API proxy are kept out of the
// index (they require a login and only redirect crawlers to /login). Keep this
// list in sync with the authenticated routes listed on /sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/dashboard',
          '/wallet',
          '/settings',
          '/profile',
          '/notifications',
          '/transactions',
          '/referrals',
          '/documents',
          '/disputes',
          '/messages',
          '/templates',
          '/calculator',
          '/announcements',
          '/support',
          '/connect',
          '/deals',
          '/invite',
          '/verify-email',
          '/reset-password',
          '/forgot-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
