import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './chat.service.js';
export async function listChats(req, res) {
    const userId = requireUserId(req);
    const result = await service.listChats(userId);
    res.status(200).json(result);
}
export async function listMessages(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const order = req.query.order === 'desc' ? 'desc' : 'asc';
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;
    const result = await service.listMessages(userId, chatId, order, limit, before);
    res.status(200).json(result);
}
export async function postMessage(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const body = req.body;
    const attachments = (body.attachments ?? []).map((ref) => ({
        kind: ref.kind,
        fileKey: ref.file_key,
        mimeType: ref.mime_type,
        sizeBytes: ref.size_bytes,
        durationSeconds: ref.duration_seconds ?? null,
    }));
    const result = await service.postMessage(userId, chatId, {
        body: typeof body.body === 'string' ? body.body : null,
        attachments,
        replyToMessageId: body.reply_to ?? null,
        forwardedFromMessageId: body.forwarded_from ?? null,
    });
    res.status(201).json(result);
}
export async function editMessage(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const body = req.body;
    const result = await service.editMessage(userId, chatId, messageId, body.body);
    res.status(200).json(result);
}
export async function deleteMessage(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const result = await service.deleteMessage(userId, chatId, messageId);
    res.status(200).json(result);
}
export async function searchMessages(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const result = await service.searchMessages(userId, chatId, q);
    res.status(200).json(result);
}
export async function getDraft(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const result = await service.getDraft(userId, chatId);
    res.status(200).json(result);
}
export async function saveDraft(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const body = req.body;
    const result = await service.saveDraft(userId, chatId, typeof body.body === 'string' ? body.body : null);
    res.status(200).json(result);
}
export async function markReceipts(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const body = req.body;
    const result = await service.markReceipts(userId, chatId, body.message_ids, body.kind);
    res.status(200).json(result);
}
export async function updateSettings(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const body = req.body;
    const result = await service.updateSettings(userId, chatId, body);
    res.status(200).json(result);
}
export async function addReaction(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const body = req.body;
    const result = await service.addReaction(userId, chatId, messageId, body.emoji);
    res.status(200).json(result);
}
export async function removeReaction(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const body = req.body;
    const result = await service.removeReaction(userId, chatId, messageId, body.emoji);
    res.status(200).json(result);
}
export async function pinMessage(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const result = await service.pinMessage(userId, chatId, messageId);
    res.status(200).json(result);
}
export async function unpinMessage(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const result = await service.unpinMessage(userId, chatId, messageId);
    res.status(200).json(result);
}
export async function forwardMessage(req, res) {
    const userId = requireUserId(req);
    const destinationChatId = requireParam(req, 'id');
    const messageId = requireParam(req, 'messageId');
    const body = req.body;
    const result = await service.forwardMessage(userId, body.sourceChatId, messageId, destinationChatId);
    res.status(201).json(result);
}
export async function listPinnedMessages(req, res) {
    const userId = requireUserId(req);
    const chatId = requireParam(req, 'id');
    const result = await service.listPinnedMessages(userId, chatId);
    res.status(200).json(result);
}
//# sourceMappingURL=chat.controller.js.map