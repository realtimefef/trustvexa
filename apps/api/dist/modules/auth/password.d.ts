/**
 * Argon2id parameters (OWASP-aligned). memoryCost is in KiB. Tune
 * memoryCost/timeCost to the Render instance class at deploy time.
 */
export declare const ARGON2_OPTIONS: {
    readonly type: 2;
    readonly memoryCost: 19456;
    readonly timeCost: 2;
    readonly parallelism: 1;
};
export declare const MIN_PASSWORD_LENGTH = 12;
export declare const MAX_PASSWORD_LENGTH = 200;
export declare function hashPassword(plain: string): Promise<string>;
export declare function verifyPassword(hash: string, plain: string): Promise<boolean>;
/** Returns true if the stored hash should be re-hashed with current params. */
export declare function needsRehash(hash: string): boolean;
export interface PasswordStrengthResult {
    ok: boolean;
    score: number;
    reasons: string[];
}
/**
 * Pure, deterministic password policy check. No I/O. Rejects passwords that
 * embed the user's email name or username so credentials are not trivially
 * guessable.
 */
export declare function checkPasswordStrength(password: string, opts?: {
    email?: string;
    username?: string;
}): PasswordStrengthResult;
/**
 * HaveIBeenPwned range API using k-anonymity: only the first 5 SHA-1 chars
 * leave the server. Returns the breach count (0 = not found). The caller
 * decides policy (e.g. reject if count > 0).
 */
export declare function pwnedCount(password: string, fetchImpl?: typeof fetch): Promise<number>;
//# sourceMappingURL=password.d.ts.map