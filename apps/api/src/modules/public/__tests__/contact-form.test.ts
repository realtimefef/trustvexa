// Contact-form validation + cookie-consent tests (task 8.4, Requirement 42.8).
import { describe, it, expect } from 'vitest';
import { validateContactForm, MESSAGE_MAX } from '../contact-form.js';
import {
  defaultConsent,
  acceptAll,
  rejectAll,
  normalizeConsent,
  encodeConsent,
  decodeConsent,
  isAllowed,
} from '../cookie-consent.js';

describe('contact form validation', () => {
  const good = {
    name: '  Alice  ',
    email: 'Alice@Example.com',
    subject: 'Help',
    message: 'I need assistance with my deal please.',
  };

  it('accepts and normalizes a valid submission', () => {
    const result = validateContactForm(good);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Alice');
      expect(result.value.email).toBe('alice@example.com');
    }
  });

  it('rejects bots via the honeypot', () => {
    const result = validateContactForm({ ...good, honeypot: 'http://spam' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('spam_detected');
  });

  it('enforces required fields and bounds', () => {
    expect(validateContactForm({ ...good, name: '' }).ok).toBe(false);
    expect(validateContactForm({ ...good, email: 'nope' }).ok).toBe(false);
    expect(validateContactForm({ ...good, subject: '' }).ok).toBe(false);
    expect(validateContactForm({ ...good, message: 'short' }).ok).toBe(false);
    expect(validateContactForm({ ...good, message: 'x'.repeat(MESSAGE_MAX + 1) }).ok).toBe(false);
  });
});

describe('cookie consent', () => {
  it('keeps necessary on and others off by default', () => {
    const d = defaultConsent();
    expect(d.necessary).toBe(true);
    expect(d.analytics).toBe(false);
    expect(rejectAll()).toEqual(d);
  });

  it('accept-all enables every category', () => {
    expect(acceptAll()).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    });
  });

  it('normalization always forces necessary true', () => {
    const n = normalizeConsent({ necessary: false, analytics: true } as never);
    expect(n.necessary).toBe(true);
    expect(n.analytics).toBe(true);
    expect(n.marketing).toBe(false);
  });

  it('round-trips through encode/decode and gates categories', () => {
    const choices = normalizeConsent({ analytics: true });
    const decoded = decodeConsent(encodeConsent(choices));
    expect(decoded).toEqual(choices);
    expect(isAllowed(decoded, 'analytics')).toBe(true);
    expect(isAllowed(decoded, 'marketing')).toBe(false);
    expect(decodeConsent(null)).toEqual(defaultConsent());
    expect(decodeConsent('not json')).toEqual(defaultConsent());
  });
});
