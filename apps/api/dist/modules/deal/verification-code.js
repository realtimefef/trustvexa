/**
 * Pure 48-digit verification-code helpers (task 4.5, validated by Property 15
 * in task 4.6).
 *
 * Side-effect free so they are trivially unit/property testable. The plaintext
 * code is shown to the requester exactly once; only its SHA-256 hash is ever
 * persisted (Requirement 10.2). The code carries ~159 bits of entropy, so a
 * keyless digest is safe against precomputation.
 */
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
/** Number of decimal digits in a verification code (Requirement 10.1). */
export const VERIFICATION_CODE_LENGTH = 48;
/** Generate a uniformly random 48-digit numeric code (leading zeros allowed). */
export function generateVerificationCode() {
    let out = '';
    for (let i = 0; i < VERIFICATION_CODE_LENGTH; i += 1) {
        out += randomInt(0, 10).toString();
    }
    return out;
}
/** SHA-256 hex hash used for blind storage + comparison (Requirement 10.2). */
export function hashVerificationCode(code) {
    return createHash('sha256').update(code).digest('hex');
}
/** Constant-time comparison of a submitted code against a stored hash. */
export function codesMatch(plain, storedHash) {
    const a = Buffer.from(hashVerificationCode(plain), 'hex');
    let b;
    try {
        b = Buffer.from(storedHash, 'hex');
    }
    catch {
        return false;
    }
    if (a.length !== b.length || b.length === 0) {
        return false;
    }
    return timingSafeEqual(a, b);
}
/**
 * Decide whether a code may still be verified. Prior verification is terminal
 * (single-use, Requirement 10.4); an exhausted attempt budget and expiry both
 * reject (Requirement 10.5). Checked in priority order: used > exhausted >
 * expired.
 */
export function evaluateCode(state, now = new Date()) {
    if (state.verifiedAt !== null) {
        return 'used';
    }
    if (state.attempts >= state.maxAttempts) {
        return 'exhausted';
    }
    if (state.expiresAt !== null && new Date(state.expiresAt).getTime() <= now.getTime()) {
        return 'expired';
    }
    return 'ok';
}
//# sourceMappingURL=verification-code.js.map