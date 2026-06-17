// E2E: Dispute critical flow — open → evidence → middleman resolve.
// Requires E2E env vars; skips gracefully when they are absent.
import { test, expect, request as pwRequest } from '@playwright/test';

// --- Helpers ---
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

// --- 1. Buyer opens a dispute ---
test('buyer can open a dispute on a funded deal', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const dealId = process.env.E2E_FUNDED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);

  // Open dispute button
  await page.getByRole('button', { name: /dispute|open dispute/i }).click();

  // Fill dispute reason
  const reasonField = page.getByLabel(/reason|description/i);
  if (await reasonField.isVisible()) {
    await reasonField.fill('E2E automated test dispute — goods not as described.');
  }

  // Submit
  await page.getByRole('button', { name: /submit|confirm/i }).click();
  await expect(page.getByText(/dispute opened|dispute created|under review/i)).toBeVisible({
    timeout: 10_000,
  });
});

// --- 2. Buyer submits evidence ---
test('buyer can submit evidence for the dispute', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const dealId = process.env.E2E_DISPUTED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/disputes/${dealId}`);

  // Evidence text/message field
  const evidenceField = page
    .getByLabel(/evidence|message|description/i)
    .or(page.getByPlaceholder(/evidence|describe/i));
  if (await evidenceField.isVisible()) {
    await evidenceField.fill(
      'Evidence from buyer: The item delivered did not match the description. Attaching screenshots.',
    );
  }

  // Submit evidence
  const submitBtn = page.getByRole('button', { name: /submit evidence|send|submit/i });
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await expect(page.getByText(/evidence submitted|received/i)).toBeVisible({ timeout: 10_000 });
  }
});

// --- 3. Middleman resolves the dispute ---
test('middleman can resolve the dispute with a split', async ({ page }) => {
  const email = process.env.E2E_MIDDLEMAN_EMAIL;
  const password = process.env.E2E_MIDDLEMAN_PASSWORD;
  const dealId = process.env.E2E_DISPUTED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/disputes/${dealId}`);

  // Click resolve
  await page.getByRole('button', { name: /resolve/i }).click();

  // Set buyer/seller split percentages
  const buyerPctField = page.getByLabel(/buyer.*percent/i).or(page.getByLabel('Buyer percentage'));
  if (await buyerPctField.isVisible()) {
    await buyerPctField.fill('60');
  }

  const sellerPctField = page
    .getByLabel(/seller.*percent/i)
    .or(page.getByLabel('Seller percentage'));
  if (await sellerPctField.isVisible()) {
    await sellerPctField.fill('40');
  }

  // Confirm resolution
  await page.getByRole('button', { name: /confirm resolution|confirm/i }).click();
  await expect(page.getByRole('alert').or(page.getByText(/settled|resolved/i))).toBeVisible({
    timeout: 10_000,
  });
});

// --- 4. Verify ledger balanced via API (post-resolution) ---
test('dispute resolution produces a balanced ledger', async () => {
  const email = process.env.E2E_MIDDLEMAN_EMAIL;
  const password = process.env.E2E_MIDDLEMAN_PASSWORD;
  const dealId = process.env.E2E_DISPUTED_DEAL_ID;
  const token = process.env.E2E_MIDDLEMAN_TOKEN;
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';
  if (!email || !password || !dealId || !token) {
    test.skip();
    return;
  }

  const apiContext = await pwRequest.newContext({ baseURL: apiUrl });
  const res = await apiContext.get(`/api/v1/treasury?dealId=${dealId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(body.ledger_balanced).toBe(true);
  expect(body.payout_rows_sum_matches_deal).toBe(true);
});
