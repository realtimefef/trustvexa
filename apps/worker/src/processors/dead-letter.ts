/**
 * Dead-letter queue processor + failure recorder.
 *
 * `processDeadLetter` handles explicit dead-letter control jobs (operator- or
 * scheduler-driven status transitions such as retry/resolve), guarded by the
 * domain's legal-transition rules.
 *
 * `recordJobFailure` is invoked by the worker bootstrap when any other queue
 * exhausts its retry attempts. It envelope-encrypts the original job payload
 * (so PII/secrets in a failed job are never stored in plaintext) and records a
 * dead-letter row with the domain-computed next status. Encryption uses the key
 * provider seam; if the KEK is not configured the payload is recorded empty
 * rather than dropping the failure record entirely.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { deadLetter, deadLetterRepo } from '@trustvexa/api/worker-jobs';
import { encryptField } from '@trustvexa/shared/crypto';
import { InvalidJobPayloadError, parseDeadLetterControlJob } from '../payloads.js';

export async function processDeadLetter(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = parseDeadLetterControlJob(job.data);
  if (!deadLetter.canTransition(data.fromStatus, data.toStatus)) {
    throw new InvalidJobPayloadError(
      `illegal dead-letter transition ${data.fromStatus} -> ${data.toStatus}`,
    );
  }
  await deadLetterRepo.setDeadLetterStatus(ctx.db, data.deadLetterId, data.toStatus);
  ctx.logger.info(
    { dead_letter_id: data.deadLetterId, from: data.fromStatus, to: data.toStatus },
    'dead-letter status updated',
  );
}

/**
 * Record a permanently-failed job onto the dead-letter store. Called once a
 * queue's BullMQ retry budget is exhausted.
 */
export async function recordJobFailure(
  ctx: ProcessorContext,
  queueName: string,
  job: Job,
  err: Error,
): Promise<void> {
  const retryCount = job.attemptsMade;
  const status = deadLetter.statusAfterFailure(retryCount);

  let payloadEnc = '';
  try {
    payloadEnc =
      (await encryptField(ctx.adapters.keyProvider, 'job', JSON.stringify(job.data ?? {}))) ?? '';
  } catch (encErr) {
    ctx.logger.error(
      {
        queue: queueName,
        err: encErr instanceof Error ? encErr.message : String(encErr),
      },
      'failed to encrypt dead-letter payload; recording without payload',
    );
  }

  await deadLetterRepo.recordDeadLetter(ctx.db, {
    jobType: queueName,
    originalJobId: job.id ?? 'unknown',
    payloadEnc,
    failureReason: err.message,
    retryCount,
    status,
  });
  ctx.logger.warn(
    { queue: queueName, job_id: job.id ?? 'unknown', retry_count: retryCount, status },
    'job recorded to dead-letter store',
  );
}
