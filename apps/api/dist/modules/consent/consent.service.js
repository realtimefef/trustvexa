/**
 * Cookie-consent service (task 8.3, Requirement 42.8).
 *
 * Records a visitor's cookie-consent choices. Works for both authenticated
 * users (attributed by `userId`) and anonymous visitors (attributed by the
 * opaque client-generated `visitorId`).
 */
import { insertCookieConsent } from './consent.repository.js';
function toIso(value) {
    if (value === null)
        return new Date().toISOString();
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function recordCookieConsent(userId, input) {
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
//# sourceMappingURL=consent.service.js.map