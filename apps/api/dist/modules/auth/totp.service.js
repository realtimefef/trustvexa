import crypto from 'node:crypto';
import argon2 from 'argon2';
import * as repo from './auth.repository.js';
import { sealPii, openPii } from '../crypto/key-provider.js';
import { AppError } from '../../errors/app-error.js';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function decodeBase32(input) {
    const clean = input.replace(/=+$/, '').toUpperCase();
    const length = clean.length;
    let bits = 0;
    let value = 0;
    const bytes = [];
    for (let i = 0; i < length; i++) {
        const idx = ALPHABET.indexOf(clean[i]);
        if (idx === -1) {
            throw new Error('Invalid base32 character');
        }
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(bytes);
}
export function generateSecret(length = 20) {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        result += ALPHABET[bytes[i] % 32];
    }
    return result;
}
export function verifyTOTP(token, secret, window = 1) {
    try {
        const key = decodeBase32(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / 30);
        for (let i = -window; i <= window; i++) {
            const currentCounter = BigInt(counter + i);
            const buffer = Buffer.alloc(8);
            buffer.writeBigInt64BE(currentCounter, 0);
            const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
            const offset = hmac[hmac.length - 1] & 0xf;
            const code = ((hmac[offset] & 0x7f) << 24) |
                ((hmac[offset + 1] & 0xff) << 16) |
                ((hmac[offset + 2] & 0xff) << 8) |
                (hmac[offset + 3] & 0xff);
            const otp = (code % 1000000).toString().padStart(6, '0');
            if (otp === token) {
                return true;
            }
        }
    }
    catch {
        return false;
    }
    return false;
}
export function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toLowerCase());
    }
    return codes;
}
/**
 * Hash a TOTP backup code for storage. Uses Argon2id so the hashes cannot be
 * brute-forced if the `totp_backup_codes_enc` column is ever exposed. The
 * backup code is short (8 hex chars = 32-bit entropy), so SHA-256 would fall
 * to an offline dictionary attack in milliseconds. (Audit FIX-P3-3)
 */
export async function hashBackupCode(code) {
    return argon2.hash(code.trim().toLowerCase(), { type: argon2.argon2id });
}
export async function verifyBackupCode(hash, code) {
    try {
        return await argon2.verify(hash, code.trim().toLowerCase());
    }
    catch {
        return false;
    }
}
export async function setupTOTP(userId) {
    const user = await repo.findUserById(userId);
    if (!user) {
        throw new AppError('not_found', 'User not found.', 404);
    }
    const secret = generateSecret();
    const qrUri = `otpauth://totp/TrustVexa:${user.username}?secret=${secret}&issuer=TrustVexa`;
    const secretEnc = await sealPii(secret);
    await repo.updateTOTP(userId, secretEnc, false, null);
    return { secret, qrUri };
}
export async function confirmTOTP(userId, token) {
    const user = await repo.findUserById(userId);
    if (!user || !user.totp_secret_enc) {
        throw new AppError('invalid_state', 'TOTP setup has not been initiated.', 400);
    }
    const secret = await openPii(user.totp_secret_enc);
    if (!secret || !verifyTOTP(token, secret)) {
        throw new AppError('invalid_credentials', 'Invalid verification code.', 400);
    }
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map(hashBackupCode));
    const backupCodesEnc = await sealPii(JSON.stringify(hashedBackupCodes));
    await repo.updateTOTP(userId, user.totp_secret_enc, true, backupCodesEnc);
    return backupCodes;
}
export async function disableTOTP(userId, token) {
    const user = await repo.findUserById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
        throw new AppError('invalid_state', 'TOTP is not enabled.', 400);
    }
    const secret = await openPii(user.totp_secret_enc);
    if (!secret || !verifyTOTP(token, secret)) {
        throw new AppError('invalid_credentials', 'Invalid verification code.', 400);
    }
    await repo.updateTOTP(userId, null, false, null);
}
export async function verifyTOTPLogin(userId, token) {
    const user = await repo.findUserById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
        return true; // No TOTP required / not enabled
    }
    const secret = await openPii(user.totp_secret_enc);
    if (secret && verifyTOTP(token, secret)) {
        return true;
    }
    // Check backup codes
    if (user.totp_backup_codes_enc) {
        const rawBackupCodes = await openPii(user.totp_backup_codes_enc);
        if (rawBackupCodes) {
            const hashedBackupCodes = JSON.parse(rawBackupCodes);
            // Find the matching backup code using constant-time Argon2 verification.
            for (let index = 0; index < hashedBackupCodes.length; index++) {
                const hash = hashedBackupCodes[index];
                if (hash && (await verifyBackupCode(hash, token))) {
                    // Single use: remove the used code
                    hashedBackupCodes.splice(index, 1);
                    const updatedBackupCodesEnc = await sealPii(JSON.stringify(hashedBackupCodes));
                    await repo.updateTOTP(userId, user.totp_secret_enc, true, updatedBackupCodesEnc);
                    return true;
                }
            }
        }
    }
    return false;
}
export async function regenerateBackupCodes(userId, token) {
    const user = await repo.findUserById(userId);
    if (!user || !user.totp_enabled || !user.totp_secret_enc) {
        throw new AppError('invalid_state', 'TOTP is not enabled.', 400);
    }
    const secret = await openPii(user.totp_secret_enc);
    if (!secret || !verifyTOTP(token, secret)) {
        throw new AppError('invalid_credentials', 'Invalid verification code.', 400);
    }
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map(hashBackupCode));
    const backupCodesEnc = await sealPii(JSON.stringify(hashedBackupCodes));
    await repo.updateTOTP(userId, user.totp_secret_enc, true, backupCodesEnc);
    return backupCodes;
}
//# sourceMappingURL=totp.service.js.map