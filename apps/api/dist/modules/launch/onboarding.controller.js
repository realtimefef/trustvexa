import * as service from './onboarding.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function getOnboarding(req, res) {
    const result = await service.getOnboarding(requireUserId(req));
    res.status(200).json(result);
}
export async function completeTask(req, res) {
    const taskKey = req.params.taskKey;
    const result = await service.completeTask(requireUserId(req), taskKey);
    res.status(200).json(result);
}
//# sourceMappingURL=onboarding.controller.js.map