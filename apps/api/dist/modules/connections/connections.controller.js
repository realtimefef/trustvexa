import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './connections.service.js';
export async function createConnection(req, res) {
    const userId = requireUserId(req);
    const body = (req.body ?? {});
    const role = body.role === 'seller' ? 'seller' : 'buyer';
    const result = await service.createConnection(userId, role);
    res.status(201).json(result);
}
export async function joinConnection(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const result = await service.joinConnection(userId, body.code);
    res.status(200).json(result);
}
export async function listConnections(req, res) {
    const userId = requireUserId(req);
    const result = await service.listConnections(userId);
    res.status(200).json(result);
}
export async function getConnection(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const result = await service.getConnection(userId, id);
    res.status(200).json(result);
}
export async function listMessages(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const channel = req.query.channel ?? undefined;
    const result = await service.listMessages(userId, id, channel);
    res.status(200).json(result);
}
export async function postMessage(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const body = req.body;
    const result = await service.postMessage(userId, id, body.body, body.channel ?? 'buyer_seller');
    res.status(201).json(result);
}
/** POST /connections/contact-middleman — one-click middleman chat (no code needed). */
export async function contactMiddleman(req, res) {
    const userId = requireUserId(req);
    const result = await service.contactMiddleman(userId);
    res.status(201).json(result);
}
/** DELETE /connections/:id — close (archive) a connection. */
export async function closeConnection(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    await service.closeConnection(userId, id);
    res.status(204).end();
}
/** POST /connections/:id/invite-middleman — bring a middleman into an existing buyer↔seller chat. */
export async function inviteMiddleman(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const result = await service.inviteMiddlemanToConnection(userId, id);
    res.status(200).json(result);
}
/** DELETE /connections/:id/messages/:msgId — soft-delete a single message (sender only). */
export async function deleteMessage(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const msgId = requireParam(req, 'msgId');
    await service.deleteMessage(userId, id, msgId);
    res.status(204).end();
}
//# sourceMappingURL=connections.controller.js.map