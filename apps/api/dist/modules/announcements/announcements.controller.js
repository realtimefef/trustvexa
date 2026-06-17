import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './announcements.service.js';
export async function listAnnouncements(req, res) {
    const userId = requireUserId(req);
    const role = req.auth?.role ?? null;
    const result = await service.listAnnouncements(userId, role);
    res.status(200).json({ announcements: result });
}
export async function markRead(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const result = await service.markRead(userId, id);
    res.status(200).json(result);
}
export async function getAnnouncement(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const role = req.auth?.role ?? null;
    const result = await service.getAnnouncement(userId, id, role);
    res.status(200).json(result);
}
//# sourceMappingURL=announcements.controller.js.map