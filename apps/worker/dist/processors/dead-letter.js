import { deadLetter, deadLetterRepo } from '@trustvexa/api/worker-jobs';
import { encryptField } from '@trustvexa/shared/crypto';
import { InvalidJobPayloadError, parseDeadLetterControlJob } from '../payloads.js';
export async function processDeadLetter(job, ctx) {
    const data = parseDeadLetterControlJob(job.data);
    if (!deadLetter.canTransition(data.fromStatus, data.toStatus)) {
        throw new InvalidJobPayloadError(`illegal dead-letter transition ${data.fromStatus} -> ${data.toStatus}`);
    }
    await deadLetterRepo.setDeadLetterStatus(ctx.db, data.deadLetterId, data.toStatus);
    ctx.logger.info({ dead_letter_id: data.deadLetterId, from: data.fromStatus, to: data.toStatus }, 'dead-letter status updated');
}
/**
 * Record a permanently-failed job onto the dead-letter store. Called once a
 * queue's BullMQ retry budget is exhausted.
 */
export async function recordJobFailure(ctx, queueName, job, err) {
    const retryCount = job.attemptsMade;
    const status = deadLetter.statusAfterFailure(retryCount);
    let payloadEnc = '';
    try {
        payloadEnc =
            (await encryptField(ctx.adapters.keyProvider, 'job', JSON.stringify(job.data ?? {}))) ?? '';
    }
    catch (encErr) {
        ctx.logger.error({
            queue: queueName,
            err: encErr instanceof Error ? encErr.message : String(encErr),
        }, 'failed to encrypt dead-letter payload; recording without payload');
    }
    await deadLetterRepo.recordDeadLetter(ctx.db, {
        jobType: queueName,
        originalJobId: job.id ?? 'unknown',
        payloadEnc,
        failureReason: err.message,
        retryCount,
        status,
    });
    ctx.logger.warn({ queue: queueName, job_id: job.id ?? 'unknown', retry_count: retryCount, status }, 'job recorded to dead-letter store');
}
//# sourceMappingURL=dead-letter.js.map