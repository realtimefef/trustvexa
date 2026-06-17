// E2E: Auth + TOTP critical flow — register → enable TOTP → login with TOTP.
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

/**
 * Generate a TOTP code from a secret. In CI, this uses the `E2E_TOTP_SECRET`
 * env var and a simple HMAC-based OTP implementation. In a real test environment,
 * the `otpauth` npm package would be used instead.
 */
function generateTotpCode(secret: string): string {
  // For E2E testing, the test environment should provide a valid code
  // via E2E_TOTP_CODE, or the test uses a predictable test secret.
  const code = process.env.E2E_TOTP_CODE;
  if (code) return code;

  // Fallback: compute TOTP using Node.js crypto (RFC 6238, 30-second window)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto');
  const time = Math.floor(Date.now() / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(time));
  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase()) {
    const val = base32Chars.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const secretBytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < secretBytes.length; i++) {
    secretBytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  const hmac = crypto.createHmac('sha1', secretBytes).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const otp =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(otp % 1_000_000).padStart(6, '0');
}

// --- 1. Register a new user ---
test('new user can register an account', async ({ page }) => {
  const email = process.env.E2E_TOTP_EMAIL;
  const password = process.env.E2E_TOTP_PASSWORD;
  const username = process.env.E2E_TOTP_USERNAME;
  if (!email || !password || !username) {
    test.skip();
    return;
  }
  await page.goto('/register');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);

  // Confirm password field if present
  const confirmPwd = page.getByLabel(/confirm password/i);
  if (await confirmPwd.isVisible()) {
    await confirmPwd.fill(password);
  }

  // Age confirmation checkbox
  const ageCheckbox = page.getByLabel(/18|adult|age/i);
  if (await ageCheckbox.isVisible()) {
    await ageCheckbox.check();
  }

  // Terms checkbox
  const termsCheckbox = page.getByLabel(/terms/i);
  if (await termsCheckbox.isVisible()) {
    await termsCheckbox.check();
  }

  // Privacy checkbox
  const privacyCheckbox = page.getByLabel(/privacy/i);
  if (await privacyCheckbox.isVisible()) {
    await privacyCheckbox.check();
  }

  await page.getByRole('button', { name: /register|sign up|create account/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();
});

// --- 2. User enables TOTP 2FA in settings ---
test('authenticated user can enable TOTP 2FA', async ({ page }) => {
  const email = process.env.E2E_TOTP_EMAIL;
  const password = process.env.E2E_TOTP_PASSWORD;
  const totpSecret = process.env.E2E_TOTP_SECRET;
  if (!email || !password || !totpSecret) {
    test.skip();
    return;
  }
  await loginAs(page, email, password);
  await page.goto('/settings');

  // Find and click the 2FA/TOTP setup button
  const setupBtn = page.getByRole('button', { name: /enable 2fa|setup 2fa|enable totp/i });
  await expect(setupBtn).toBeVisible({ timeout: 10_000 });
  await setupBtn.click();

  // Wait for the QR code / secret to appear
  await expect(page.getByText(/scan|secret|authenticator/i)).toBeVisible({ timeout: 10_000 });

  // Generate and enter the confirmation code
  const code = generateTotpCode(totpSecret);
  const codeField = page
    .getByLabel(/code|verification/i)
    .or(page.getByPlaceholder(/6-digit|code/i));
  await codeField.fill(code);

  // Confirm
  await page.getByRole('button', { name: /confirm|verify|enable/i }).click();

  // Should see backup codes or success confirmation
  await expect(page.getByText(/backup codes|2fa enabled|successfully enabled/i)).toBeVisible({
    timeout: 10_000,
  });
});

// --- 3. User logs in with TOTP ---
test('user with TOTP enabled sees 2FA prompt on login', async ({ page }) => {
  const email = process.env.E2E_TOTP_EMAIL;
  const password = process.env.E2E_TOTP_PASSWORD;
  const totpSecret = process.env.E2E_TOTP_SECRET;
  if (!email || !password || !totpSecret) {
    test.skip();
    return;
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Should show TOTP input step instead of going to dashboard
  const totpField = page
    .getByLabel(/security code|totp|verification code/i)
    .or(page.locator('#totpCode'));
  await expect(totpField).toBeVisible({ timeout: 10_000 });

  // Generate and enter the TOTP code
  const code = generateTotpCode(totpSecret);
  await totpField.fill(code);

  // Submit TOTP
  await page.getByRole('button', { name: /verify|log in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page.getByText(/dashboard/i)).toBeVisible();
});

// --- 4. Invalid TOTP code is rejected ---
test('invalid TOTP code shows error message', async ({ page }) => {
  const email = process.env.E2E_TOTP_EMAIL;
  const password = process.env.E2E_TOTP_PASSWORD;
  if (!email || !password) {
    test.skip();
    return;
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for TOTP step
  const totpField = page
    .getByLabel(/security code|totp|verification code/i)
    .or(page.locator('#totpCode'));
  await expect(totpField).toBeVisible({ timeout: 10_000 });

  // Enter an invalid code
  await totpField.fill('000000');
  await page.getByRole('button', { name: /verify|log in/i }).click();

  // Should show error
  await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10_000 });
});
