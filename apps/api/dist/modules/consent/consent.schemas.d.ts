/**
 * Zod schema for recording cookie-consent choices (task 8.3, Requirement 42.8).
 *
 * Essential cookies are always required to run the Service, so `essential` is
 * pinned to `true`; the optional categories are free booleans. An opaque,
 * client-generated `visitorId` lets us attribute consent for anonymous
 * visitors without any PII.
 */
import { z } from 'zod';
export declare const consentChoicesSchema: z.ZodObject<{
    essential: z.ZodLiteral<true>;
    functional: z.ZodBoolean;
    analytics: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    analytics: boolean;
    essential: true;
    functional: boolean;
}, {
    analytics: boolean;
    essential: true;
    functional: boolean;
}>;
export declare const cookieConsentSchema: z.ZodObject<{
    visitorId: z.ZodOptional<z.ZodString>;
    choices: z.ZodObject<{
        essential: z.ZodLiteral<true>;
        functional: z.ZodBoolean;
        analytics: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        analytics: boolean;
        essential: true;
        functional: boolean;
    }, {
        analytics: boolean;
        essential: true;
        functional: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    choices: {
        analytics: boolean;
        essential: true;
        functional: boolean;
    };
    visitorId?: string | undefined;
}, {
    choices: {
        analytics: boolean;
        essential: true;
        functional: boolean;
    };
    visitorId?: string | undefined;
}>;
export type ConsentChoices = z.infer<typeof consentChoicesSchema>;
export type CookieConsentInput = z.infer<typeof cookieConsentSchema>;
//# sourceMappingURL=consent.schemas.d.ts.map