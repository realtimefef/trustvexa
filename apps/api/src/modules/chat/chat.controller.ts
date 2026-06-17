/**
 * Chat history HTTP controllers (read-only REST). The caller is always derived
 * from the verified JWT (never from the path or body), and the chat id comes
 * from the Zod-validated path. Access decisions live in the service, which
 * returns the opaque 404 for chats the caller may not read.
 */
import type { Request, Response } from 'express';

import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './chat.service.js';

export async function listChats(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.listChats(userId);
  res.status(200).json(result);
}

export async function listMessages(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const order = req.query.order === 'desc' ? 'desc' : 'asc';
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const before = typeof req.query.before === 'string' ? req.query.before : undefined;
  const result = await service.listMessages(userId, chatId, order, limit, before);
  res.status(200).json(result);
}

interface AttachmentRefBody {
  kind: 'image' | 'video' | 'voice' | 'document';
  file_key: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds?: number | null;
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const body = req.body as {
    body?: string | null;
    attachments?: AttachmentRefBody[];
    reply_to?: string | null;
    forwarded_from?: string | null;
  };
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

export async function editMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const body = req.body as { body: string };
  const result = await service.editMessage(userId, chatId, messageId, body.body);
  res.status(200).json(result);
}

export async function deleteMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const result = await service.deleteMessage(userId, chatId, messageId);
  res.status(200).json(result);
}

export async function searchMessages(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const result = await service.searchMessages(userId, chatId, q);
  res.status(200).json(result);
}

export async function getDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const result = await service.getDraft(userId, chatId);
  res.status(200).json(result);
}

export async function saveDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const body = req.body as { body?: string | null };
  const result = await service.saveDraft(
    userId,
    chatId,
    typeof body.body === 'string' ? body.body : null,
  );
  res.status(200).json(result);
}

export async function markReceipts(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const body = req.body as { message_ids: string[]; kind: 'delivered' | 'read' };
  const result = await service.markReceipts(userId, chatId, body.message_ids, body.kind);
  res.status(200).json(result);
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const body = req.body as { isMuted?: boolean; isArchived?: boolean };
  const result = await service.updateSettings(userId, chatId, body);
  res.status(200).json(result);
}

export async function addReaction(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const body = req.body as { emoji: string };
  const result = await service.addReaction(userId, chatId, messageId, body.emoji);
  res.status(200).json(result);
}

export async function removeReaction(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const body = req.body as { emoji: string };
  const result = await service.removeReaction(userId, chatId, messageId, body.emoji);
  res.status(200).json(result);
}

export async function pinMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const result = await service.pinMessage(userId, chatId, messageId);
  res.status(200).json(result);
}

export async function unpinMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const result = await service.unpinMessage(userId, chatId, messageId);
  res.status(200).json(result);
}

export async function forwardMessage(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const destinationChatId = requireParam(req, 'id');
  const messageId = requireParam(req, 'messageId');
  const body = req.body as { sourceChatId: string };
  const result = await service.forwardMessage(
    userId,
    body.sourceChatId,
    messageId,
    destinationChatId,
  );
  res.status(201).json(result);
}

export async function listPinnedMessages(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const chatId = requireParam(req, 'id');
  const result = await service.listPinnedMessages(userId, chatId);
  res.status(200).json(result);
}
