/**
 * Cookie-consent service (task 8.3, Requirement 42.8).
 *
 * Records a visitor's cookie-consent choices. Works for both authenticated
 * users (attributed by `userId`) and anonymous visitors (attributed by the
 * opaque client-generated `visitorId`).
 */
import { insertCookieConsent } from './consent.repository.js';
import type { CookieConsentInput } from './consent.schemas.js';

export interface ConsentResult {
  id: string;
  consentedAt: string;
}

function toIso(value: Date | string | null): string {
  if (value === null) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function recordCookieConsent(
  userId: string | null,
  input: CookieConsentInput,
): Promise<ConsentResult> {
  const row = await insertCookieConsent({
    userId,
    visitorId: input.visitorId ?? null,
    choices: input.choices,
  });

  return {
    id: row.id,
    consentedAt: toIso(row.consented_at),
  };
}
