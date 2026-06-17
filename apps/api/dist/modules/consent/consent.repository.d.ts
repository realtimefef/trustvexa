import type { ConsentChoices } from './consent.schemas.js';
export interface CookieConsentRow {
    id: string;
    consented_at: Date | string | null;
    created_at: Date | string;
}
export interface InsertCookieConsentParams {
    userId: string | null;
    visitorId: string | null;
    choices: ConsentChoices;
}
export declare function insertCookieConsent(params: InsertCookieConsentParams): Promise<CookieConsentRow>;
//# sourceMappingURL=consent.repository.d.ts.map