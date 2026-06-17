// Feature: trustvexa-escrow-platform, Property 19: Uploads are accepted only within type, size, duration, and scan limits
// Validates: Requirements 29.5, 29.6 (fast-check, min 100 iterations)
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateUpload,
  isUploadAccepted,
  canDeliverAttachment,
  limitsFor,
  type AttachmentKind,
  type ScanStatus,
} from '../upload-validation.js';

const kinds: AttachmentKind[] = ['image', 'video', 'voice', 'document'];
const scans: ScanStatus[] = ['pending', 'clean', 'quarantined', 'blocked'];

describe('Property 19: upload acceptance', () => {
  it('an upload is accepted iff it passes all limits AND scanned clean', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...kinds),
        fc.constantFrom(...scans),
        fc.boolean(),
        fc.bigInt({ min: 0n, max: 300n * 1024n * 1024n }),
        fc.integer({ min: 0, max: 5000 }),
        (kind, scan, useGoodMime, size, duration) => {
          const limits = limitsFor(kind);
          const mime = useGoodMime ? limits.allowedMime[0]! : 'application/x-not-allowed';
          const candidate = {
            kind,
            mimeType: mime,
            sizeBytes: size,
            durationSeconds: limits.maxDurationSeconds === null ? undefined : duration,
          };
          const accepted = isUploadAccepted(candidate, scan);
          const valid = validateUpload(candidate).ok;
          expect(accepted).toBe(valid && scan === 'clean');
          if (accepted) {
            expect(scan).toBe('clean');
            expect(canDeliverAttachment(scan)).toBe(true);
          }
        },
      ),
      { numRuns: 400 },
    );
  });

  it('an empty or oversized file is never accepted', () => {
    fc.assert(
      fc.property(fc.constantFrom(...kinds), (kind) => {
        const limits = limitsFor(kind);
        const empty = {
          kind,
          mimeType: limits.allowedMime[0]!,
          sizeBytes: 0n,
          durationSeconds: limits.maxDurationSeconds === null ? undefined : 1,
        };
        const tooBig = { ...empty, sizeBytes: limits.maxBytes + 1n };
        expect(isUploadAccepted(empty, 'clean')).toBe(false);
        expect(isUploadAccepted(tooBig, 'clean')).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
