import * as terms from './terms.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function getAgreement(req, res) {
    const requesterId = requireUserId(req);
    const result = await terms.getAgreement({ dealId: req.params.id, requesterId });
    res.status(200).json(result);
}
export async function acceptTerms(req, res) {
    const userId = requireUserId(req);
    const result = await terms.acceptTerms({
        dealId: req.params.id,
        userId,
        input: req.body,
    });
    res.status(200).json(result);
}
//# sourceMappingURL=terms.controller.js.map