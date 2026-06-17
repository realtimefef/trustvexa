import { describe, expect, it } from 'vitest';
import { createWebhookSchema } from '../webhook.schemas.js';
import { isSafeWebhookUrl } from '../webhook-url.js';

describe('webhook URL safety', () => {
  it.each([
    'http://example.com/hook',
    'https://localhost/hook',
    'https://127.0.0.1/hook',
    'https://10.0.0.2/hook',
    'https://169.254.169.254/latest/meta-data',
    'https://[::1]/hook',
    'https://user:password@example.com/hook',
  ])('rejects unsafe target %s', (url) => {
    expect(isSafeWebhookUrl(url)).toBe(false);
    expect(createWebhookSchema.safeParse({ url, events: ['deal.funded'] }).success).toBe(false);
  });

  it('allows a public HTTPS endpoint', () => {
    const url = 'https://hooks.example.com/trustvexa';
    expect(isSafeWebhookUrl(url)).toBe(true);
    expect(createWebhookSchema.safeParse({ url, events: ['deal.funded'] }).success).toBe(true);
  });
});
