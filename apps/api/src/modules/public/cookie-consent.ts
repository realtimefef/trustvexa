// Cookie consent logic (task 8.3, Requirement 42.8). Pure: the banner writes
// the resulting choices to cookie_consents (visitor_id, consent_choices).
// 'necessary' cookies are always on and cannot be rejected.

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences';

export const CONSENT_CATEGORIES: readonly ConsentCategory[] = [
  'necessary',
  'analytics',
  'marketing',
  'preferences',
];

export interface ConsentChoices {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

/** Default state before any choice: only strictly-necessary cookies. */
export function defaultConsent(): ConsentChoices {
  return { necessary: true, analytics: false, marketing: false, preferences: false };
}

export function acceptAll(): ConsentChoices {
  return { necessary: true, analytics: true, marketing: true, preferences: true };
}

export function rejectAll(): ConsentChoices {
  return defaultConsent();
}

/** Normalize an arbitrary partial choice, forcing necessary = true. */
export function normalizeConsent(input: Partial<Record<ConsentCategory, boolean>>): ConsentChoices {
  return {
    necessary: true,
    analytics: input.analytics === true,
    marketing: input.marketing === true,
    preferences: input.preferences === true,
  };
}

export function encodeConsent(choices: ConsentChoices): string {
  return JSON.stringify(choices);
}

export function decodeConsent(raw: string | null): ConsentChoices {
  if (!raw) return defaultConsent();
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ConsentCategory, boolean>>;
    return normalizeConsent(parsed);
  } catch {
    return defaultConsent();
  }
}

/** Whether a given category may set cookies under the current choices. */
export function isAllowed(choices: ConsentChoices, category: ConsentCategory): boolean {
  return choices[category] === true;
}
