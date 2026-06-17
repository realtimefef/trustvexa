export interface SitemapEntry {
    path: string;
    changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority?: number;
}
export declare const PUBLIC_ROUTES: readonly SitemapEntry[];
/** Build a sitemap.xml string for the given origin (e.g. https://trustvexa.com). */
export declare function buildSitemap(origin: string, routes?: readonly SitemapEntry[]): string;
//# sourceMappingURL=sitemap.d.ts.map