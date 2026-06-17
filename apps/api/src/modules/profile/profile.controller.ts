/**
 * Authenticated profile HTTP controllers. The user id is always taken from the
 * verified JWT (via `requireUserId`), so these endpoints are inherently scoped
 * to the caller and can never read or mutate another user's data.
 */
import type { Request, Response } from 'express';

import { requireUserId } from '../../lib/http-params.js';
import type { UpdatePreferencesInput, UpdateProfileInput } from './profile.schemas.js';
import * as service from './profile.service.js';
import * as authService from '../auth/auth.service.js';
import * as accountService from '../auth/account.service.js';
import type { AccountActionInput } from '../auth/auth.schemas.js';

export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getMyProfile(userId);
  res.status(200).json(result);
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const input = req.body as UpdateProfileInput;
  const result = await service.updateProfile(userId, input);
  res.status(200).json(result);
}

export async function getPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await service.getPreferences(userId);
  res.status(200).json(result);
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const input = req.body as UpdatePreferencesInput;
  const result = await service.upsertPreferences(userId, input);
  res.status(200).json(result);
}

import { getObjectStorage } from '../storage/object-storage.js';

function readRawBody(req: Request, maxBytes: number = 5 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let bytesRead = 0;
    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        reject(new Error('File size limit exceeded (max 5MB)'));
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}

export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);

  let bytes: Buffer;
  try {
    bytes = await readRawBody(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read request body';
    res.status(400).json({ error_code: 'BAD_REQUEST', message });
    return;
  }

  if (bytes.length === 0) {
    res.status(400).json({ error_code: 'BAD_REQUEST', message: 'No file content received' });
    return;
  }

  const contentType = req.headers['content-type'] || 'image/jpeg';
  let ext = 'jpg';
  if (contentType.includes('png')) ext = 'png';
  else if (contentType.includes('gif')) ext = 'gif';
  else if (contentType.includes('webp')) ext = 'webp';
  else if (contentType.includes('svg')) ext = 'svg';

  const key = `avatars/${userId}.${ext}`;
  const storage = getObjectStorage();
  const putResult = await storage.put(key, bytes, contentType);

  if (!putResult.stored) {
    res.status(500).json({ error_code: 'STORAGE_ERROR', message: 'Failed to persist avatar' });
    return;
  }

  const avatarUrl = `/api/v1/public/avatar/${userId}`;
  await service.updateAvatarUrl(userId, key);

  res.status(200).json({ avatar_url: avatarUrl });
}

export async function revokeSessions(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await authService.logoutAll(userId);
  res.status(200).json({ ok: true });
}

export async function deleteMe(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const { password, reason } = req.body as AccountActionInput;
  const result = await accountService.requestDeletion(userId, password, reason ?? null);
  res.status(200).json(result);
}
