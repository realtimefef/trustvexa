import { AppError } from '../../errors/app-error.js';
import * as service from './admin.service.js';
import * as riskService from './risk.service.js';
import * as settingService from './admin-setting.service.js';
import * as enforcement from './enforcement.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
function requestId(req) {
    return req.requestId ?? 'unknown';
}
export async function getQueue(req, res) {
    const userId = requireUserId(req);
    const result = await service.getMiddlemanQueue(userId);
    res.status(200).json(result);
}
export async function getDisputes(req, res) {
    const userId = requireUserId(req);
    const result = await service.getOpenDisputes(userId);
    res.status(200).json(result);
}
export async function getRisk(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    if (!dealId)
        throw new AppError('bad_request', 'Missing deal id route parameter.', 400);
    const result = await riskService.getRiskPanel(userId, dealId);
    res.status(200).json(result);
}
export async function getCriticalSettings(_req, res) {
    res.status(200).json(riskService.getCriticalSettings());
}
export async function listSettingChanges(req, res) {
    requireUserId(req);
    const settingKey = String(req.query.settingKey);
    const result = await settingService.listSettingChanges(settingKey);
    res.status(200).json(result);
}
export async function requestSettingChange(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const result = await settingService.requestSettingChange(userId, body);
    res.status(201).json(result);
}
export async function applySettingChange(req, res) {
    requireUserId(req);
    const changeId = req.params.changeId;
    if (!changeId)
        throw new AppError('bad_request', 'Missing changeId route parameter.', 400);
    const result = await settingService.applySettingChange(changeId);
    res.status(200).json(result);
}
export async function rollbackSettingChange(req, res) {
    requireUserId(req);
    const changeId = req.params.changeId;
    if (!changeId)
        throw new AppError('bad_request', 'Missing changeId route parameter.', 400);
    const result = await settingService.rollbackSettingChange(changeId);
    res.status(200).json(result);
}
/**
 * Enforcement actions on a user: block / unblock / label / trust-downgrade.
 * Each action is fully audited inside the enforcement service's transaction.
 */
export async function enforce(req, res) {
    const actorId = requireUserId(req);
    const reqId = requestId(req);
    const targetUserId = req.params.userId;
    const action = req.params.action;
    if (!targetUserId || !action) {
        throw new AppError('bad_request', 'Missing route parameters.', 400);
    }
    const body = req.body;
    switch (action) {
        case 'block':
            res.status(200).json(await enforcement.blockUser({
                actorId,
                targetUserId,
                reason: body.reason,
                requestId: reqId,
            }));
            return;
        case 'unblock':
            res.status(200).json(await enforcement.unblockUser({
                actorId,
                targetUserId,
                reason: body.reason,
                requestId: reqId,
            }));
            return;
        case 'label':
            if (!body.label) {
                throw new AppError('label_required', 'An account label is required.', 422);
            }
            res.status(200).json(await enforcement.setUserLabel({
                actorId,
                targetUserId,
                label: body.label,
                reason: body.reason,
                requestId: reqId,
            }));
            return;
        case 'trust-downgrade':
            if (body.amount === undefined) {
                throw new AppError('amount_required', 'A downgrade amount is required.', 422);
            }
            res.status(200).json(await enforcement.downgradeTrust({
                actorId,
                targetUserId,
                amount: Number(body.amount),
                reason: body.reason,
                requestId: reqId,
            }));
            return;
        default:
            throw new AppError('unknown_action', `Unknown enforcement action: ${action}`, 422);
    }
}
export async function blockUser(req, res) {
    const actorId = requireUserId(req);
    const reqId = requestId(req);
    const targetUserId = req.params.userId;
    if (!targetUserId)
        throw new AppError('bad_request', 'Missing target userId.', 400);
    const body = req.body;
    if (!body.reason)
        throw new AppError('reason_required', 'A block reason is required.', 422);
    const result = await enforcement.blockUser({
        actorId,
        targetUserId,
        reason: body.reason,
        requestId: reqId,
    });
    res.status(200).json(result);
}
export async function deleteUser(req, res) {
    const actorId = requireUserId(req);
    const reqId = requestId(req);
    const targetUserId = req.params.userId;
    if (!targetUserId)
        throw new AppError('bad_request', 'Missing target userId.', 400);
    const body = req.body;
    if (!body.reason)
        throw new AppError('reason_required', 'A deletion reason is required.', 422);
    const result = await enforcement.deleteUser({
        actorId,
        targetUserId,
        reason: body.reason,
        requestId: reqId,
    });
    res.status(200).json(result);
}
//# sourceMappingURL=admin.controller.js.map