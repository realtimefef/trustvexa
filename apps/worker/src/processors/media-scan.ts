/**
 * Media scan processor.
 *
 * Runs an uploaded attachment through the malware-scanner seam and persists the
 * outcome on `message_attachments` via the attachment repository. An attachment
 * is only ever delivered once it is `clean`; an infected file is `quarantined`
 * and anything the scanner cannot read is `blocked`. The scanner itself is
 * operator-provisioned, so until it is configured the seam throws and the job
 * dead-letters rather than marking unsafe media as clean.
 */
import type { Job } from 'bullmq';
import type { ProcessorContext } from './index.js';
import { attachmentRepo } from '@trustvexa/api/worker-jobs';
import { parseMediaScanJob } from '../payloads.js';

type PersistedScanStatus = 'clean' | 'quarantined' | 'blocked';

export async function processMediaScan(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = parseMediaScanJob(job.data);
  const result = await ctx.adapters.scanner.scan({
    storageKey: data.storageKey,
    ...(data.sha256 !== undefined ? { sha256: data.sha256 } : {}),
  });

  let scanStatus: PersistedScanStatus;
  let quarantineReason: string | null = null;
  if (result.verdict === 'clean') {
    scanStatus = 'clean';
  } else if (result.verdict === 'infected') {
    scanStatus = 'quarantined';
    quarantineReason = result.detail ?? 'malware detected';
  } else {
    scanStatus = 'blocked';
    quarantineReason = result.detail ?? 'attachment could not be scanned';
  }

  await attachmentRepo.setScanStatus(ctx.db, data.attachmentId, scanStatus, quarantineReason);
  ctx.logger.info(
    { attachment_id: data.attachmentId, verdict: result.verdict, scan_status: scanStatus },
    'attachment scan persisted',
  );
}
