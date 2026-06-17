/**
 * CAPTCHA verification (task 1).
 * Integrates with hCaptcha siteverify API, or falls back to true if no secret is configured.
 */
export async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    // Stub fallback when HCAPTCHA_SECRET is not configured
    return true;
  }
  if (!token) {
    return false;
  }
  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });
    const data = (await response.json()) as { success: boolean };
    return !!data?.success;
  } catch (error) {
    console.error('CAPTCHA verification failed:', error);
    return false;
  }
}
