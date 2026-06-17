import * as service from './dashboard.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        // The role guard (slot 7) should already have rejected anonymous access;
        // this is a defensive belt-and-suspenders check.
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function getDashboard(req, res) {
    const userId = requireUserId(req);
    const result = await service.getDashboard(userId);
    res.status(200).json(result);
}
export async function getDealDetail(req, res) {
    const userId = requireUserId(req);
    const result = await service.getDealDetail(userId, req.params.id);
    res.status(200).json(result);
}
//# sourceMappingURL=dashboard.controller.js.map