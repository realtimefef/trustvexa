// Feature: trustvexa-escrow-platform, Property 18: Deleted messages hide from the user but remain for the middleman
// Validates: Requirements 27.4 (fast-check, min 100 iterations)
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isMessageVisible,
  filterMessagesForViewer,
  editHistoryFor,
  projectMessage,
  type MessageRecord,
} from '../message-visibility.js';

function arbMessage(): fc.Arbitrary<MessageRecord> {
  return fc.record({
    id: fc.uuid(),
    senderId: fc.option(fc.uuid(), { nil: null }),
    bodyEnc: fc.option(fc.string(), { nil: null }),
    isEdited: fc.boolean(),
    isDeleted: fc.boolean(),
    deletedBy: fc.option(fc.uuid(), { nil: null }),
    adminDeletedAt: fc.option(fc.constant('2026-01-01T00:00:00Z'), { nil: null }),
  });
}

describe('Property 18: deleted-message visibility', () => {
  it('admin-deleted messages are hidden from everyone', () => {
    fc.assert(
      fc.property(arbMessage(), (msg) => {
        if (msg.adminDeletedAt !== null) {
          expect(isMessageVisible(msg, 'participant')).toBe(false);
          expect(isMessageVisible(msg, 'middleman')).toBe(false);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('user-deleted (not admin) messages hide from participant but remain for middleman', () => {
    fc.assert(
      fc.property(arbMessage(), (msg) => {
        if (msg.adminDeletedAt === null && msg.isDeleted) {
          expect(isMessageVisible(msg, 'participant')).toBe(false);
          expect(isMessageVisible(msg, 'middleman')).toBe(true);
          expect(projectMessage(msg, 'participant')).toBeNull();
          expect(projectMessage(msg, 'middleman')?.deletedForUsers).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('non-deleted messages are visible to everyone', () => {
    fc.assert(
      fc.property(arbMessage(), (msg) => {
        if (msg.adminDeletedAt === null && !msg.isDeleted) {
          expect(isMessageVisible(msg, 'participant')).toBe(true);
          expect(isMessageVisible(msg, 'middleman')).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('the middleman never sees fewer messages than a participant', () => {
    fc.assert(
      fc.property(fc.array(arbMessage(), { maxLength: 30 }), (msgs) => {
        const forParticipant = filterMessagesForViewer(msgs, 'participant').length;
        const forMiddleman = filterMessagesForViewer(msgs, 'middleman').length;
        expect(forMiddleman).toBeGreaterThanOrEqual(forParticipant);
      }),
      { numRuns: 200 },
    );
  });

  it('edit history is exposed only to the middleman', () => {
    const edits = [{ messageId: 'm', oldBodyEnc: 'old', editedAt: '2026-01-01T00:00:00Z' }];
    expect(editHistoryFor(edits, 'participant')).toHaveLength(0);
    expect(editHistoryFor(edits, 'middleman')).toHaveLength(1);
  });
});
