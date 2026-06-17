export declare function generateSecret(length?: number): string;
export declare function verifyTOTP(token: string, secret: string, window?: number): boolean;
export declare function generateBackupCodes(): string[];
/**
 * Hash a TOTP backup code for storage. Uses Argon2id so the hashes cannot be
 * brute-forced if the `totp_backup_codes_enc` column is ever exposed. The
 * backup code is short (8 hex chars = 32-bit entropy), so SHA-256 would fall
 * to an offline dictionary attack in milliseconds. (Audit FIX-P3-3)
 */
export declare function hashBackupCode(code: string): Promise<string>;
export declare function verifyBackupCode(hash: string, code: string): Promise<boolean>;
export interface TOTPSetupResult {
    secret: string;
    qrUri: string;
}
export declare function setupTOTP(userId: string): Promise<TOTPSetupResult>;
export declare function confirmTOTP(userId: string, token: string): Promise<string[]>;
export declare function disableTOTP(userId: string, token: string): Promise<void>;
export declare function verifyTOTPLogin(userId: string, token: string): Promise<boolean>;
export declare function regenerateBackupCodes(userId: string, token: string): Promise<string[]>;
//# sourceMappingURL=totp.service.d.ts.map