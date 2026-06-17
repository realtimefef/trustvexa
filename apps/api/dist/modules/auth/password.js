/**
 * Password & identity primitives (task 3.1).
 *
 * Argon2id hashing (never returned to any party, including the middleman),
 * a pure password-strength policy, and a HaveIBeenPwned k-anonymity breach
 * check. The strength policy is intentionally I/O-free so it stays unit
 * testable; the breach check is the only function that touches the network.
 * (Requirements 1.4, 1.5, 2.3, 2.4, 43.7)
 */
import argon2 from 'argon2';
import { createHash } from 'node:crypto';
/**
 * Argon2id parameters (OWASP-aligned). memoryCost is in KiB. Tune
 * memoryCost/timeCost to the Render instance class at deploy time.
 */
export const ARGON2_OPTIONS = {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
};
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 200;
export async function hashPassword(plain) {
    return argon2.hash(plain, ARGON2_OPTIONS);
}
export async function verifyPassword(hash, plain) {
    try {
        return await argon2.verify(hash, plain);
    }
    catch {
        return false;
    }
}
/** Returns true if the stored hash should be re-hashed with current params. */
export function needsRehash(hash) {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
}
/**
 * Pure, deterministic password policy check. No I/O. Rejects passwords that
 * embed the user's email name or username so credentials are not trivially
 * guessable.
 */
export function checkPasswordStrength(password, opts = {}) {
    const reasons = [];
    if (password.length < MIN_PASSWORD_LENGTH) {
        reasons.push(`Must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password.length > MAX_PASSWORD_LENGTH) {
        reasons.push(`Must be at most ${MAX_PASSWORD_LENGTH} characters`);
    }
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
    if (classes < 3) {
        reasons.push('Use at least 3 of: lowercase, uppercase, number, symbol');
    }
    const lower = password.toLowerCase();
    const localPart = opts.email?.split('@')[0]?.toLowerCase();
    if (localPart && lower.includes(localPart)) {
        reasons.push('Must not contain your email name');
    }
    if (opts.username && lower.includes(opts.username.toLowerCase())) {
        reasons.push('Must not contain your username');
    }
    const score = Math.max(0, Math.min(4, classes + (password.length >= 16 ? 1 : 0) - reasons.length));
    return { ok: reasons.length === 0, score, reasons };
}
/**
 * HaveIBeenPwned range API using k-anonymity: only the first 5 SHA-1 chars
 * leave the server. Returns the breach count (0 = not found). The caller
 * decides policy (e.g. reject if count > 0).
 */
export async function pwnedCount(password, fetchImpl = fetch) {
    const sha1 = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const url = 'https://api.pwnedpasswords.com/range/' + prefix;
    const res = await fetchImpl(url, { headers: { 'Add-Padding': 'true' } });
    if (!res.ok) {
        throw new Error(`pwned range lookup failed: ${res.status}`);
    }
    const body = await res.text();
    for (const line of body.split('\n')) {
        const [hashSuffix, count] = line.trim().split(':');
        if (hashSuffix === suffix) {
            return Number.parseInt(count ?? '0', 10) || 0;
        }
    }
    return 0;
}
//# sourceMappingURL=password.js.map