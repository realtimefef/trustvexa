import { test, expect } from '@playwright/test';

const LEGAL_PAGES = [
  { path: '/legal/terms', mustContain: ['Terms of Service', 'TrustVexa'] },
  { path: '/legal/privacy', mustContain: ['Privacy Policy', 'personal data'] },
  { path: '/legal/cookie', mustContain: ['Cookie Policy'] },
  { path: '/legal/refund-dispute', mustContain: ['Refund', 'Dispute'] },
  { path: '/legal/prohibited', mustContain: ['Prohibited Items'] },
  { path: '/legal/security', mustContain: ['Security', 'TrustVexa'] },
  { path: '/accessibility', mustContain: ['Accessibility'] },
];

for (const { path, mustContain } of LEGAL_PAGES) {
  test(`${path} renders correct content`, async ({ page }) => {
    await page.goto(path);
    for (const text of mustContain) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
  });
}

test('security.txt is reachable and RFC 9116 compliant', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('Contact:');
  expect(body).toContain('Expires:');
});

test('contact form submits and returns 200', async ({ request }) => {
  const res = await request.post('/api/v1/contact', {
    data: { name: 'Test User', email: 'test@example.com', message: 'Hello from Playwright E2E' },
  });
  expect(res.status()).toBe(200);
});
