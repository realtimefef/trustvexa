export interface SecurityTxtConfig {
    contactEmail: string;
    /** ISO-8601 expiry timestamp (RFC 9116 requires a future Expires). */
    expires: string;
    encryptionUrl?: string;
    policyUrl: string;
    canonicalUrl: string;
    preferredLanguages?: string;
}
export declare function buildSecurityTxt(config: SecurityTxtConfig): string;
export declare const SECURITY_TXT_PATH = "/.well-known/security.txt";
//# sourceMappingURL=security-txt.d.ts.map