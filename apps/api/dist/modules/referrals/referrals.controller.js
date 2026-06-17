import { requireUserId } from '../../lib/http-params.js';
import * as service from './referrals.service.js';
export async function listReferrals(req, res) {
    const userId = requireUserId(req);
    const result = await service.listReferrals(userId);
    res.status(200).json(result);
}
export async function createCode(req, res) {
    const userId = requireUserId(req);
    const result = await service.getOrCreateCode(userId);
    res.status(201).json(result);
}
//# sourceMappingURL=referrals.controller.js.map