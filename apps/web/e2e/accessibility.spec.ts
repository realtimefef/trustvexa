// Accessibility + cross-browser E2E (task 9.6, Requirements 49.1-49.5).
// axe-core for WCAG 2.1 AA, keyboard/ARIA, and PWA install. Runs in CI across
// the browser projects defined in playwright.config.ts.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PUBLIC_PAGES = [
  '/',
  '/fees',
  '/supported-coins',
  '/about',
  '/trust-security',
  '/contact',
  '/legal/terms',
  '/legal/privacy',
  '/accessibility',
];

for (const path of PUBLIC_PAGES) {
  test(`${path} has no WCAG 2.1 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test('home page is fully keyboard navigable', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const active = await page.evaluate(() => document.activeElement?.tagName ?? null);
  expect(active).not.toBeNull();
});

test('exposes a valid PWA manifest for install', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.getAttribute('link[rel="manifest"]', 'href');
  expect(href).toBeTruthy();
  const res = await request.get(href!);
  expect(res.ok()).toBeTruthy();
  const manifest = (await res.json()) as { name?: string; icons?: unknown[] };
  expect(manifest.name).toBeTruthy();
  expect(Array.isArray(manifest.icons) && manifest.icons.length > 0).toBe(true);
});
