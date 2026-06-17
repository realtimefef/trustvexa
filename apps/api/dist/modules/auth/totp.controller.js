import * as totpService from './totp.service.js';
import * as authService from './auth.service.js';
import { requireUserId } from '../../lib/http-params.js';
import { requestMeta, sendAuthResult } from './auth.controller.js';
import { AppError } from '../../errors/app-error.js';
export async function setup(req, res) {
    const userId = requireUserId(req);
    const result = await totpService.setupTOTP(userId);
    res.status(200).json(result);
}
export async function confirm(req, res) {
    const userId = requireUserId(req);
    const { token } = req.body;
    if (!token) {
        throw new AppError('bad_request', 'Verification code is required.', 400);
    }
    const backupCodes = await totpService.confirmTOTP(userId, token);
    res.status(200).json({ backup_codes: backupCodes });
}
export async function disable(req, res) {
    const userId = requireUserId(req);
    const { token } = req.body;
    if (!token) {
        throw new AppError('bad_request', 'Verification code is required to disable TOTP.', 400);
    }
    await totpService.disableTOTP(userId, token);
    res.status(204).end();
}
export async function regenerateBackupCodes(req, res) {
    const userId = requireUserId(req);
    const { token } = req.body;
    if (!token) {
        throw new AppError('bad_request', 'Verification code is required to regenerate backup codes.', 400);
    }
    const backupCodes = await totpService.regenerateBackupCodes(userId, token);
    res.status(200).json({ backup_codes: backupCodes });
}
export async function verify(req, res) {
    const { email, password, code, rememberMe } = req.body;
    if (!email || !password || !code) {
        throw new AppError('bad_request', 'Email, password, and verification code are required.', 400);
    }
    const result = await authService.verifyTOTPAndLogin({ email, password, code, rememberMe: rememberMe ?? false }, requestMeta(req));
    sendAuthResult(res, result);
}
//# sourceMappingURL=totp.controller.js.map