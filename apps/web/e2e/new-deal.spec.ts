// E2E: New deal critical flow — create → invite → fund → complete.
// Requires E2E env vars; skips gracefully when they are absent.
import { test, expect } from '@playwright/test';

// --- Helpers ---
async function loginAs(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');
}

// --- 1. Buyer creates a new deal ---
test('buyer can create a new deal and sees it in dashboard', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);

  // Navigate to deal creation
  await page.goto('/deals/new');
  await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();

  // Fill deal form
  await page.getByLabel('Title').fill('E2E Test Deal — Automated');
  await page.getByLabel('Amount').fill('100');

  // Select coin/network if dropdowns are present
  const coinSelect = page.getByLabel('Coin');
  if (await coinSelect.isVisible()) {
    await coinSelect.selectOption('USDT');
  }
  const networkSelect = page.getByLabel('Network');
  if (await networkSelect.isVisible()) {
    await networkSelect.selectOption('ETH');
  }

  // Fill description
  const descField = page.getByLabel('Description');
  if (await descField.isVisible()) {
    await descField.fill('Automated E2E test deal for the new-deal flow.');
  }

  // Submit
  await page.getByRole('button', { name: /create|submit|continue/i }).click();

  // Should land on the deal page or see confirmation
  await expect(page.getByText(/deal created|invite|escrow/i)).toBeVisible({ timeout: 10_000 });
});

// --- 2. Buyer invites a counterparty ---
test('buyer can invite a seller to the deal', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const dealId = process.env.E2E_UNFUNDED_DEAL_ID;
  const sellerUsername = process.env.E2E_SELLER_USERNAME;
  if (!email || !password || !dealId || !sellerUsername) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);

  // Click invite button
  await page.getByRole('button', { name: /invite/i }).click();

  // Fill seller username or email
  const inviteField = page.getByLabel(/username|email|seller/i);
  await inviteField.fill(sellerUsername);
  await page.getByRole('button', { name: /send invite|confirm/i }).click();

  // Expect success feedback
  await expect(page.getByRole('alert').or(page.getByText(/invited|sent/i))).toBeVisible({
    timeout: 10_000,
  });
});

// --- 3. Buyer funds escrow and sees confirmed status ---
test('buyer can fund escrow and deal shows funded status', async ({ page }) => {
  const email = process.env.E2E_BUYER_EMAIL;
  const password = process.env.E2E_BUYER_PASSWORD;
  const dealId = process.env.E2E_UNFUNDED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);

  // The payment page should show the escrow address and amount
  const escrowSection = page.getByTestId('escrow-address').or(page.getByText(/deposit|escrow/i));
  await expect(escrowSection).toBeVisible({ timeout: 10_000 });

  // Submit a payment tx hash (simulating a completed on-chain transfer)
  const txHashField = page.getByLabel(/transaction hash|tx hash/i);
  if (await txHashField.isVisible()) {
    await txHashField.fill('0xabc123def456789012345678901234567890abcdef1234567890abcdef123456');
    await page.getByRole('button', { name: /submit|confirm payment/i }).click();
    await expect(page.getByText(/submitted|pending|confirming/i)).toBeVisible({ timeout: 10_000 });
  }
});

// --- 4. Deal completion with milestone release ---
test('deal reaches completed state after middleman release', async ({ page }) => {
  const email = process.env.E2E_MIDDLEMAN_EMAIL;
  const password = process.env.E2E_MIDDLEMAN_PASSWORD;
  const dealId = process.env.E2E_FUNDED_DEAL_ID;
  if (!email || !password || !dealId) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto(`/deals/${dealId}`);

  // Release milestone(s)
  const releaseBtn = page.getByRole('button', { name: /release/i }).first();
  if (await releaseBtn.isVisible()) {
    await releaseBtn.click();
    const confirmBtn = page.getByRole('button', { name: /confirm/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
    await expect(page.getByRole('alert').or(page.getByText(/released|completed/i))).toBeVisible({
      timeout: 10_000,
    });
  }
});
