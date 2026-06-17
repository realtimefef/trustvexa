import * as invites from './invite.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function createInvite(req, res) {
    const sellerId = requireUserId(req);
    const result = await invites.createInvite({
        sellerId,
        dealId: req.params.id,
        input: req.body,
    });
    res.status(201).json(result);
}
export async function listInvites(req, res) {
    const sellerId = requireUserId(req);
    const result = await invites.listInvites({ sellerId, dealId: req.params.id });
    res.status(200).json({ invites: result });
}
export async function previewInvite(req, res) {
    const viewerId = requireUserId(req);
    const { token } = req.body;
    const result = await invites.previewInvite({ viewerId, token });
    res.status(200).json(result);
}
export async function acceptInvite(req, res) {
    const userId = requireUserId(req);
    const { token } = req.body;
    const result = await invites.acceptInvite({ userId, token });
    res.status(200).json(result);
}
export async function revokeInvite(req, res) {
    const sellerId = requireUserId(req);
    const { reason } = req.body;
    await invites.revokeInvite({ sellerId, inviteId: req.params.id, reason: reason ?? null });
    res.status(204).end();
}
//# sourceMappingURL=invite.controller.js.map