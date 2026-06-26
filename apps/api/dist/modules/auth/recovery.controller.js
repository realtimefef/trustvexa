import * as recovery from './recovery.service.js';
import * as stepUp from './step-up.js';
export async function requestEmailVerification(req, res) {
    if (req.auth?.userId) {
        await recovery.requestEmailVerification(req.auth.userId);
    }
    res.status(202).json({ ok: true });
}
export async function verifyEmail(req, res) {
    await recovery.verifyEmail(req.body.token);
    res.status(200).json({ ok: true });
}
export async function forgotPassword(req, res) {
    await recovery.forgotPassword(req.body);
    res.status(202).json({ ok: true });
}
export async function resetPassword(req, res) {
    await recovery.resetPassword(req.body);
    res.status(200).json({ ok: true });
}
export async function changePassword(req, res) {
    await recovery.changePassword(req.auth.userId, req.body);
    res.status(200).json({ ok: true });
}
export async function changeEmail(req, res) {
    await recovery.changeEmail(req.auth.userId, req.body);
    res.status(202).json({ ok: true });
}
export async function setRecoveryEmail(req, res) {
    await recovery.setRecoveryEmail(req.auth.userId, req.body);
    res.status(200).json({ ok: true });
}
export async function requestStepUp(req, res) {
    const { actionType, dealId } = req.body;
    const challenge = await stepUp.createStepUpChallenge(req.auth.userId, actionType, dealId ?? null);
    // The token is delivered out-of-band; only metadata is returned to the caller.
    res.status(201).json({ step_up_id: challenge.id, expires_at: challenge.expiresAt.toISOString() });
}
export async function confirmStepUp(req, res) {
    const { token, actionType } = req.body;
    const confirmed = await stepUp.confirmStepUp(req.auth.userId, actionType, token);
    res.status(confirmed ? 200 : 400).json({ confirmed });
}
export async function acceptPolicy(req, res) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing.');
    }
    const { docType, version } = req.body;
    await recovery.acceptPolicy(userId, { docType, version });
    res.status(200).json({ ok: true });
}
//# sourceMappingURL=recovery.controller.js.map