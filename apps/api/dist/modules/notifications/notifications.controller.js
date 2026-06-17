import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './notifications.service.js';
export async function listNotifications(req, res) {
    const userId = requireUserId(req);
    const q = req.query;
    const params = { includeArchived: q.archived === 'true' };
    if (q.limit !== undefined)
        params.limit = Number(q.limit);
    if (q.cursor !== undefined)
        params.cursor = q.cursor;
    const result = await service.listForUser(userId, params);
    res.status(200).json(result);
}
export async function markRead(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const result = await service.markOneRead(userId, id);
    res.status(200).json(result);
}
export async function markAllRead(req, res) {
    const userId = requireUserId(req);
    const result = await service.markAllRead(userId);
    res.status(200).json(result);
}
export async function getPreferences(req, res) {
    const userId = requireUserId(req);
    const result = await service.getPreferences(userId);
    res.status(200).json({ preferences: result });
}
export async function upsertPreference(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const result = await service.upsertPreference(userId, {
        eventType: body.event_type,
        channel: body.channel,
        enabled: body.enabled,
    });
    res.status(200).json(result);
}
export async function subscribePush(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const result = await service.subscribePush(userId, {
        endpoint: body.endpoint,
        p256dhKey: body.p256dh_key,
        authKey: body.auth_key,
        device: body.device ?? null,
    });
    res.status(201).json(result);
}
//# sourceMappingURL=notifications.controller.js.map