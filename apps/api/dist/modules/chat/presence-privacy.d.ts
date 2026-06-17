import type { DealRole } from './chat-types.js';
export type PresenceEventType = 'presence' | 'typing' | 'last_seen' | 'read_delivery';
/**
 * Whether a presence-class signal about `subjectRole` may be emitted to
 * `recipientRole`. The single hard invariant (Property 17): if the subject is
 * the middleman, the answer is always false for buyer/seller recipients.
 */
export declare function canEmitPresenceTo(subjectRole: DealRole, recipientRole: DealRole): boolean;
export interface PresenceRecipient {
    userId: string;
    role: DealRole;
}
/** Filter a recipient list down to those allowed to receive the subject's presence. */
export declare function allowedPresenceRecipients(subjectRole: DealRole, recipients: readonly PresenceRecipient[]): PresenceRecipient[];
//# sourceMappingURL=presence-privacy.d.ts.map