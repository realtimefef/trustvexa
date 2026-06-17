export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences';
export declare const CONSENT_CATEGORIES: readonly ConsentCategory[];
export interface ConsentChoices {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
}
/** Default state before any choice: only strictly-necessary cookies. */
export declare function defaultConsent(): ConsentChoices;
export declare function acceptAll(): ConsentChoices;
export declare function rejectAll(): ConsentChoices;
/** Normalize an arbitrary partial choice, forcing necessary = true. */
export declare function normalizeConsent(input: Partial<Record<ConsentCategory, boolean>>): ConsentChoices;
export declare function encodeConsent(choices: ConsentChoices): string;
export declare function decodeConsent(raw: string | null): ConsentChoices;
/** Whether a given category may set cookies under the current choices. */
export declare function isAllowed(choices: ConsentChoices, category: ConsentCategory): boolean;
//# sourceMappingURL=cookie-consent.d.ts.map