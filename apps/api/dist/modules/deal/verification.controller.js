import * as verification from './verification.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function requestCode(req, res) {
    const requesterId = requireUserId(req);
    const result = await verification.requestVerificationCode({
        dealId: req.params.id,
        requesterId,
    });
    res.status(201).json(result);
}
export async function submitCode(req, res) {
    const submitterId = requireUserId(req);
    const { code } = req.body;
    const result = await verification.submitVerificationCode({
        dealId: req.params.id,
        submitterId,
        code,
    });
    res.status(200).json(result);
}
//# sourceMappingURL=verification.controller.js.map