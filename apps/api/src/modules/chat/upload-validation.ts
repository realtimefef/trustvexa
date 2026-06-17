// File upload validation + malware-scan gating (task 6.7).
// Pure limit checks per attachment kind plus the scan-status gate. The actual
// scan runs server-side; an attachment is only ever delivered once it is clean.
// (Requirements 29.1, 29.2, 29.3, 29.5, 29.6)

export type AttachmentKind = 'image' | 'video' | 'voice' | 'document';
export type ScanStatus = 'pending' | 'clean' | 'quarantined' | 'blocked';

export interface UploadLimits {
  maxBytes: bigint;
  allowedMime: readonly string[];
  maxDurationSeconds: number | null;
}

/** Per-kind limits. Sizes use bigint to match the bigint size_bytes column. */
export function limitsFor(kind: AttachmentKind): UploadLimits {
  switch (kind) {
    case 'image':
      return {
        maxBytes: 10n * 1024n * 1024n,
        allowedMime: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
        maxDurationSeconds: null,
      };
    case 'video':
      return {
        maxBytes: 200n * 1024n * 1024n,
        allowedMime: ['video/mp4', 'video/webm', 'video/quicktime'],
        maxDurationSeconds: 300,
      };
    case 'voice':
      return {
        maxBytes: 25n * 1024n * 1024n,
        allowedMime: ['audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/wav'],
        maxDurationSeconds: 600,
      };
    case 'document':
      return {
        maxBytes: 50n * 1024n * 1024n,
        allowedMime: [
          'application/pdf',
          'text/plain',
          'application/zip',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        maxDurationSeconds: null,
      };
  }
}

export interface UploadCandidate {
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: bigint;
  durationSeconds?: number | null;
}

export type UploadRejectReason =
  | 'mime_not_allowed'
  | 'too_large'
  | 'empty_file'
  | 'too_long'
  | 'missing_duration';

export type UploadValidation = { ok: true } | { ok: false; reason: UploadRejectReason };

/** Validate type, size, and duration against the kind's limits. */
export function validateUpload(candidate: UploadCandidate): UploadValidation {
  const limits = limitsFor(candidate.kind);
  if (!limits.allowedMime.includes(candidate.mimeType)) {
    return { ok: false, reason: 'mime_not_allowed' };
  }
  if (candidate.sizeBytes <= 0n) {
    return { ok: false, reason: 'empty_file' };
  }
  if (candidate.sizeBytes > limits.maxBytes) {
    return { ok: false, reason: 'too_large' };
  }
  if (limits.maxDurationSeconds !== null) {
    const duration = candidate.durationSeconds;
    if (duration === undefined || duration === null) {
      return { ok: false, reason: 'missing_duration' };
    }
    if (duration > limits.maxDurationSeconds) {
      return { ok: false, reason: 'too_long' };
    }
  }
  return { ok: true };
}

/** An attachment may be delivered/previewed only after a clean scan. */
export function canDeliverAttachment(scanStatus: ScanStatus): boolean {
  return scanStatus === 'clean';
}

export type ScanAction = 'deliver' | 'hold' | 'quarantine' | 'block';

/** Map a scan status to the delivery action. */
export function scanOutcomeAction(scanStatus: ScanStatus): ScanAction {
  switch (scanStatus) {
    case 'clean':
      return 'deliver';
    case 'pending':
      return 'hold';
    case 'quarantined':
      return 'quarantine';
    case 'blocked':
      return 'block';
  }
}

/** The full acceptance test (Property 19): valid limits AND a clean scan. */
export function isUploadAccepted(candidate: UploadCandidate, scanStatus: ScanStatus): boolean {
  return validateUpload(candidate).ok && canDeliverAttachment(scanStatus);
}
