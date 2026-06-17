// Sitemap generator for public, indexable pages (task 8.2). Pure XML builder.
export const PUBLIC_ROUTES = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/fees', changefreq: 'weekly', priority: 0.8 },
    { path: '/supported-coins', changefreq: 'weekly', priority: 0.7 },
    { path: '/about', changefreq: 'monthly', priority: 0.6 },
    { path: '/trust-security', changefreq: 'monthly', priority: 0.6 },
    { path: '/contact', changefreq: 'monthly', priority: 0.5 },
    { path: '/legal/terms', changefreq: 'monthly', priority: 0.4 },
    { path: '/legal/privacy', changefreq: 'monthly', priority: 0.4 },
    { path: '/legal/cookies', changefreq: 'monthly', priority: 0.3 },
    { path: '/legal/refunds', changefreq: 'monthly', priority: 0.3 },
    { path: '/legal/prohibited-items', changefreq: 'monthly', priority: 0.3 },
    { path: '/accessibility', changefreq: 'yearly', priority: 0.2 },
];
function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
/** Build a sitemap.xml string for the given origin (e.g. https://trustvexa.com). */
export function buildSitemap(origin, routes = PUBLIC_ROUTES) {
    const base = origin.replace(/\/+$/, '');
    const urls = routes
        .map((r) => {
        const parts = [`    <loc>${escapeXml(base + r.path)}</loc>`];
        if (r.changefreq)
            parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
        if (r.priority !== undefined)
            parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
        return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
//# sourceMappingURL=sitemap.js.map