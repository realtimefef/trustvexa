/** Number of decimal digits in a verification code (Requirement 10.1). */
export declare const VERIFICATION_CODE_LENGTH = 48;
/** Generate a uniformly random 48-digit numeric code (leading zeros allowed). */
export declare function generateVerificationCode(): string;
/** SHA-256 hex hash used for blind storage + comparison (Requirement 10.2). */
export declare function hashVerificationCode(code: string): string;
/** Constant-time comparison of a submitted code against a stored hash. */
export declare function codesMatch(plain: string, storedHash: string): boolean;
export type CodeUsability = 'ok' | 'used' | 'expired' | 'exhausted';
export interface CodeState {
    readonly verifiedAt: string | null;
    readonly expiresAt: string | null;
    readonly attempts: number;
    readonly maxAttempts: number;
}
/**
 * Decide whether a code may still be verified. Prior verification is terminal
 * (single-use, Requirement 10.4); an exhausted attempt budget and expiry both
 * reject (Requirement 10.5). Checked in priority order: used > exhausted >
 * expired.
 */
export declare function evaluateCode(state: CodeState, now?: Date): CodeUsability;
//# sourceMappingURL=verification-code.d.ts.map