import type { MetadataRoute } from 'next';

// Public origin used to build absolute sitemap URLs. Falls back to the
// production domain when the env var is not set.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://trustvexa.com').replace(/\/$/, '');

const PUBLIC_PATHS: ReadonlyArray<string> = [
  '/',
  '/how-it-works',
  '/fees',
  '/coins',
  '/use-cases',
  '/about',
  '/about-developer',
  '/contact',
  '/security',
  '/help',
  '/docs',
  '/status',
  '/faq',
  '/terms',
  '/privacy',
  '/cookie',
  '/refund-dispute',
  '/prohibited',
  '/accessibility',
  '/sitemap',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
