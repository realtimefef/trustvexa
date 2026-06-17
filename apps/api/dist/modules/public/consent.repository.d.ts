export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface CookieConsentRow {
    id: string;
    user_id: string | null;
    visitor_id: string;
    consent_choices: string;
    consented_at: string;
}
export declare function recordConsent(tx: TxClient, input: {
    userId: string | null;
    visitorId: string;
    consentChoices: string;
}): Promise<CookieConsentRow>;
/** Most recent consent for a visitor (the effective choice). */
export declare function latestConsent(tx: TxClient, visitorId: string): Promise<CookieConsentRow | null>;
//# sourceMappingURL=consent.repository.d.ts.map