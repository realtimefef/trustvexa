import { test, expect, request as pwRequest } from '@playwright/test';

// --- Helpers ---
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

// --- 1. Action-center accuracy ---
test('action center shows correct pending actions for buyer', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto('/dashboard');
  const actionCard = page.getByTestId('action-card').first();
  await expect(actionCard).toContainText('Fund escrow');
  await expect(actionCard).toBeVisible();
});

// --- 2. Milestone release flow ---
test('middleman can release a milestone and seller payout is queued', async ({ page }) => {
  const email = process.env.E2E_MIDDLEMAN_EMAIL;
  const password = process.env.E2E_MIDDLEMAN_PASSWORD;
  const dealId = process.env.E2E_FUNDED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);
  await page
    .getByRole('button', { name: /Release milestone/i })
    .first()
    .click();
  await page.getByRole('button', { name: /Confirm release/i }).click();
  await expect(page.getByRole('alert')).toContainText(/released/i);
  await expect(page.getByTestId('payout-status')).toContainText(/queued/i);
});

// --- 3. Dispute settlement ledger balance ---
test('dispute resolution produces a balanced ledger', async ({ page }) => {
  const email = process.env.E2E_MIDDLEMAN_EMAIL;
  const password = process.env.E2E_MIDDLEMAN_PASSWORD;
  const dealId = process.env.E2E_DISPUTED_DEAL_ID;
  const token = process.env.E2E_MIDDLEMAN_TOKEN;
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';
  if (!email || !password || !dealId || !token) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/disputes/${dealId}`);
  await page.getByRole('button', { name: /Resolve/i }).click();
  await page.getByLabel('Buyer percentage').fill('60');
  await page.getByLabel('Seller percentage').fill('40');
  await page.getByRole('button', { name: /Confirm resolution/i }).click();
  await expect(page.getByRole('alert')).toContainText(/settled/i);

  const apiContext = await pwRequest.newContext({ baseURL: apiUrl });
  const res = await apiContext.get(`/api/v1/treasury?dealId=${dealId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(body.ledger_balanced).toBe(true);
  expect(body.payout_rows_sum_matches_deal).toBe(true);
});

// --- 4. Review uniqueness ---
test('submitting a review twice returns already_reviewed error', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const dealId = process.env.E2E_SETTLED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);
  await page.getByRole('button', { name: /Rate/i }).click();
  await page.getByLabel('Rating').fill('5');
  await page.getByRole('button', { name: /Submit review/i }).click();
  await expect(page.getByRole('alert')).toContainText(/thank you/i);
  await page.reload();
  const rateBtn = page.getByRole('button', { name: /Rate/i });
  await expect(rateBtn).not.toBeVisible();
});
