import type { DealStatus } from '../deal/state-machine.js';
import type { DealRole } from '../chat/chat-types.js';
export interface NextAction {
    /** Stable machine code for the action (drives UI + analytics). */
    code: string;
    /** Short human-facing label. */
    label: string;
    /** True when the deal cannot progress until this user acts. */
    blocking: boolean;
}
/** Compute the action center entries for a role at a given deal state. */
export declare function nextActionsFor(role: DealRole, status: DealStatus): readonly NextAction[];
/** Whether this role is currently the blocker for the deal's progress. */
export declare function isWaitingOn(role: DealRole, status: DealStatus): boolean;
export interface TimelineEntry {
    at: string;
    code: string;
    actorRole: DealRole | 'system';
}
/** Sort raw timeline rows oldest-first for display/export (Req 37.4). */
export declare function orderTimeline(entries: ReadonlyArray<TimelineEntry>): TimelineEntry[];
//# sourceMappingURL=action-center.d.ts.map