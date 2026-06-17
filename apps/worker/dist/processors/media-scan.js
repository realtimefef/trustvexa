import { attachmentRepo } from '@trustvexa/api/worker-jobs';
import { parseMediaScanJob } from '../payloads.js';
export async function processMediaScan(job, ctx) {
    const data = parseMediaScanJob(job.data);
    const result = await ctx.adapters.scanner.scan({
        storageKey: data.storageKey,
        ...(data.sha256 !== undefined ? { sha256: data.sha256 } : {}),
    });
    let scanStatus;
    let quarantineReason = null;
    if (result.verdict === 'clean') {
        scanStatus = 'clean';
    }
    else if (result.verdict === 'infected') {
        scanStatus = 'quarantined';
        quarantineReason = result.detail ?? 'malware detected';
    }
    else {
        scanStatus = 'blocked';
        quarantineReason = result.detail ?? 'attachment could not be scanned';
    }
    await attachmentRepo.setScanStatus(ctx.db, data.attachmentId, scanStatus, quarantineReason);
    ctx.logger.info({ attachment_id: data.attachmentId, verdict: result.verdict, scan_status: scanStatus }, 'attachment scan persisted');
}
//# sourceMappingURL=media-scan.js.map