import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './webhook.service.js';
export async function create(req, res) {
    const userId = requireUserId(req);
    const input = req.body;
    const result = await service.createWebhook(userId, input);
    res.status(201).json(result);
}
export async function list(req, res) {
    const userId = requireUserId(req);
    const result = await service.listWebhooks(userId);
    res.status(200).json(result);
}
export async function remove(req, res) {
    const userId = requireUserId(req);
    const webhookId = requireParam(req, 'id');
    await service.deleteWebhook(userId, webhookId);
    res.status(204).end();
}
//# sourceMappingURL=webhook.controller.js.map