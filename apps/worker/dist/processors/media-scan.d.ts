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
export declare function processMediaScan(job: Job, ctx: ProcessorContext): Promise<void>;
//# sourceMappingURL=media-scan.d.ts.map