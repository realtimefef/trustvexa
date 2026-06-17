/**
 * Step-up confirmations for sensitive actions (task 3.6).
 *
 * A short-lived challenge is created and its token delivered out-of-band; the
 * caller must confirm with the token before the guarded action proceeds. Only
 * the token hash is stored (`step_up_confirmations`). (Requirements 3.6)
 */
import { randomBytes } from 'node:crypto';

import * as repo from './auth.repository.js';
import { hashToken } from './token-store.js';

const STEP_UP_TTL_MS = 5 * 60 * 1000;

export interface StepUpChallenge {
  id: string;
  token: string;
  expiresAt: Date;
}

/** Create a short-lived step-up challenge for a sensitive action. */
export async function createStepUpChallenge(
  userId: string,
  actionType: string,
  dealId: string | null = null,
): Promise<StepUpChallenge> {
  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + STEP_UP_TTL_MS);
  const id = await repo.insertStepUp({
    userId,
    actionType,
    dealId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { id, token, expiresAt };
}

/** Validate and consume a step-up confirmation. Returns true on success. */
export async function confirmStepUp(
  userId: string,
  actionType: string,
  token: string,
): Promise<boolean> {
  const record = await repo.findStepUp(hashToken(token), actionType);
  if (!record || record.user_id !== userId) return false;
  if (record.confirmed_at) return false;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return false;
  await repo.confirmStepUp(record.id);
  return true;
}
