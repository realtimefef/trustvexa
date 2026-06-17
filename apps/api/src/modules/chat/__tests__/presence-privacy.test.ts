// Feature: trustvexa-escrow-platform, Property 17: The middleman's presence is never exposed to users
// Validates: Requirements 28.3, 28.4 (fast-check, min 100 iterations)
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { canEmitPresenceTo, allowedPresenceRecipients } from '../presence-privacy.js';
import type { DealRole } from '../chat-types.js';

const roles: DealRole[] = ['buyer', 'seller', 'middleman'];
const arbRole = (): fc.Arbitrary<DealRole> => fc.constantFrom(...roles);

describe('Property 17: middleman presence privacy', () => {
  it('a middleman presence signal never reaches a buyer or seller', () => {
    fc.assert(
      fc.property(arbRole(), (recipient) => {
        if (recipient !== 'middleman') {
          expect(canEmitPresenceTo('middleman', recipient)).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('buyer/seller presence may reach any party', () => {
    fc.assert(
      fc.property(arbRole(), arbRole(), (subject, recipient) => {
        if (subject !== 'middleman') {
          expect(canEmitPresenceTo(subject, recipient)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('filtered recipient list for a middleman subject contains no users', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ userId: fc.uuid(), role: arbRole() }), { maxLength: 12 }),
        (recipients) => {
          const allowed = allowedPresenceRecipients('middleman', recipients);
          expect(allowed.every((r) => r.role === 'middleman')).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
