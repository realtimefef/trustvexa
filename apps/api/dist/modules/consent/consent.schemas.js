/**
 * Zod schema for recording cookie-consent choices (task 8.3, Requirement 42.8).
 *
 * Essential cookies are always required to run the Service, so `essential` is
 * pinned to `true`; the optional categories are free booleans. An opaque,
 * client-generated `visitorId` lets us attribute consent for anonymous
 * visitors without any PII.
 */
import { z } from 'zod';
export const consentChoicesSchema = z.object({
    essential: z.literal(true),
    functional: z.boolean(),
    analytics: z.boolean(),
});
export const cookieConsentSchema = z.object({
    visitorId: z.string().trim().min(1).max(128).optional(),
    choices: consentChoicesSchema,
});
//# sourceMappingURL=consent.schemas.js.map