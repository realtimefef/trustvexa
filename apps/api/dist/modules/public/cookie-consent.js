// Cookie consent logic (task 8.3, Requirement 42.8). Pure: the banner writes
// the resulting choices to cookie_consents (visitor_id, consent_choices).
// 'necessary' cookies are always on and cannot be rejected.
export const CONSENT_CATEGORIES = [
    'necessary',
    'analytics',
    'marketing',
    'preferences',
];
/** Default state before any choice: only strictly-necessary cookies. */
export function defaultConsent() {
    return { necessary: true, analytics: false, marketing: false, preferences: false };
}
export function acceptAll() {
    return { necessary: true, analytics: true, marketing: true, preferences: true };
}
export function rejectAll() {
    return defaultConsent();
}
/** Normalize an arbitrary partial choice, forcing necessary = true. */
export function normalizeConsent(input) {
    return {
        necessary: true,
        analytics: input.analytics === true,
        marketing: input.marketing === true,
        preferences: input.preferences === true,
    };
}
export function encodeConsent(choices) {
    return JSON.stringify(choices);
}
export function decodeConsent(raw) {
    if (!raw)
        return defaultConsent();
    try {
        const parsed = JSON.parse(raw);
        return normalizeConsent(parsed);
    }
    catch {
        return defaultConsent();
    }
}
/** Whether a given category may set cookies under the current choices. */
export function isAllowed(choices, category) {
    return choices[category] === true;
}
//# sourceMappingURL=cookie-consent.js.map