import type { CookieConsentInput } from './consent.schemas.js';
export interface ConsentResult {
    id: string;
    consentedAt: string;
}
export declare function recordCookieConsent(userId: string | null, input: CookieConsentInput): Promise<ConsentResult>;
//# sourceMappingURL=consent.service.d.ts.map