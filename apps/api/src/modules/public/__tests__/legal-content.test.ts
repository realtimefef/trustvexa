// Content + snapshot tests for the public/legal surface (task 8.4,
// Requirements 42.8, 47.5). Pure, offline-runnable vitest.
import { describe, it, expect } from 'vitest';
import { LEGAL_DOCS, acceptanceRequiredDocTypes, findLegalDoc } from '../legal-documents.js';
import { buildSecurityTxt, SECURITY_TXT_PATH } from '../security-txt.js';
import { buildSitemap, PUBLIC_ROUTES } from '../sitemap.js';
import { needsReacceptance, pendingAcceptances, latestVersion } from '../policy-versions.js';
import { buildFeeTable, buildFeeSummary } from '../fees-presenter.js';
import { buildSupportedCoinsTable, isSupportedPair } from '../supported-coins.js';

describe('legal document registry', () => {
  it('exposes the full legal set with unique slugs', () => {
    const slugs = LEGAL_DOCS.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(LEGAL_DOCS.map((d) => d.docType)).toEqual([
      'terms',
      'privacy',
      'cookie',
      'refund_dispute',
      'prohibited_items',
      'security',
      'accessibility',
      'sitemap',
    ]);
  });

  it('requires acceptance for terms, privacy, and prohibited items', () => {
    expect(acceptanceRequiredDocTypes().sort()).toEqual(
      ['prohibited_items', 'privacy', 'terms'].sort(),
    );
    expect(findLegalDoc('terms').requiresAcceptance).toBe(true);
  });
});

describe('security.txt (RFC 9116)', () => {
  it('is served at the well-known path and contains required fields', () => {
    expect(SECURITY_TXT_PATH).toBe('/.well-known/security.txt');
    const txt = buildSecurityTxt({
      contactEmail: 'support@trustvexa.com',
      expires: '2027-01-01T00:00:00Z',
      policyUrl: 'https://trustvexa.com/security',
      canonicalUrl: 'https://trustvexa.com/.well-known/security.txt',
    });
    expect(txt).toContain('Contact: mailto:support@trustvexa.com');
    expect(txt).toContain('Expires: 2027-01-01T00:00:00Z');
    expect(txt).toContain('Policy: https://trustvexa.com/security');
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('rejects a non-email contact', () => {
    expect(() =>
      buildSecurityTxt({
        contactEmail: 'not-an-email',
        expires: '2027-01-01T00:00:00Z',
        policyUrl: 'p',
        canonicalUrl: 'c',
      }),
    ).toThrow();
  });
});

describe('sitemap', () => {
  it('renders well-formed XML for every public route', () => {
    const xml = buildSitemap('https://trustvexa.com/');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://trustvexa.com/</loc>');
    expect(xml).toContain('<loc>https://trustvexa.com/fees</loc>');
    // No double slashes from origin + path.
    expect(xml).not.toContain('com//');
    const locCount = (xml.match(/<loc>/g) ?? []).length;
    expect(locCount).toBe(PUBLIC_ROUTES.length);
  });
});

describe('policy re-acceptance', () => {
  it('requires acceptance when never accepted or outdated', () => {
    expect(needsReacceptance(null, 1)).toBe(true);
    expect(needsReacceptance(1, 2)).toBe(true);
    expect(needsReacceptance(2, 2)).toBe(false);
    expect(needsReacceptance(3, 2)).toBe(false);
  });

  it('lists only the outdated required docs as pending', () => {
    const pending = pendingAcceptances(
      ['terms', 'privacy', 'prohibited_items'],
      { terms: 2, privacy: 1, prohibited_items: 1 },
      { terms: 1, privacy: 1 },
    );
    expect(pending).toEqual(['terms', 'prohibited_items']);
  });

  it('selects the highest version', () => {
    const latest = latestVersion([
      { docType: 'terms', version: 1, summary: '', contentHash: 'a', publishedAt: '' },
      { docType: 'terms', version: 3, summary: '', contentHash: 'c', publishedAt: '' },
      { docType: 'terms', version: 2, summary: '', contentHash: 'b', publishedAt: '' },
    ]);
    expect(latest?.version).toBe(3);
  });
});

describe('fees page derives from the engine', () => {
  it('renders all tiers and a coherent summary', () => {
    const table = buildFeeTable();
    expect(table).toHaveLength(7);
    expect(table[0]?.percent).toBe('5%');
    expect(table.at(-1)?.percent).toBe('1.35%');
    expect(table.at(-1)?.to).toBe('$50,000.00');
    const summary = buildFeeSummary();
    expect(summary.minPlatformFee).toBe('$30.00');
    expect(summary.settlementFeePercent).toBe('0.5%');
    expect(summary.dealRange.min).toBe('$400.00');
  });
});

describe('supported coins', () => {
  it('lists all coins and validates pairs', () => {
    expect(buildSupportedCoinsTable().map((c) => c.symbol)).toEqual([
      'USDT',
      'ETH',
      'BNB',
      'TRX',
      'SOL',
    ]);
    expect(isSupportedPair('USDT', 'TRON')).toBe(true);
    expect(isSupportedPair('SOL', 'ETH')).toBe(false);
  });
});
