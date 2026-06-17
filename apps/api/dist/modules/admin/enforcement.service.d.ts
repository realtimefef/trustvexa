import { type AccountLabel } from './enforcement.constants.js';
export interface EnforcementResult {
    userId: string;
    action: string;
    accountStatus?: string;
    accountLabel?: string;
    trustLevel?: number;
    auditId: string;
}
/** Block a user from the platform (audited). Already-blocked is idempotent. */
export declare function blockUser(input: {
    actorId: string;
    targetUserId: string;
    reason: string;
    requestId: string;
}): Promise<EnforcementResult>;
/** Lift a block / review hold, returning the user to active status (audited). */
export declare function unblockUser(input: {
    actorId: string;
    targetUserId: string;
    reason: string;
    requestId: string;
}): Promise<EnforcementResult>;
/** Set a user's account label (trust/limit tier), audited. */
export declare function setUserLabel(input: {
    actorId: string;
    targetUserId: string;
    label: AccountLabel;
    reason: string;
    requestId: string;
}): Promise<EnforcementResult>;
/** Lower a user's trust level by a positive amount (audited + warning notice). */
export declare function downgradeTrust(input: {
    actorId: string;
    targetUserId: string;
    amount: number;
    reason: string;
    requestId: string;
}): Promise<EnforcementResult>;
/** Permanently delete a user from the platform (soft-delete status 'deleted', audited). */
export declare function deleteUser(input: {
    actorId: string;
    targetUserId: string;
    reason: string;
    requestId: string;
}): Promise<EnforcementResult>;
//# sourceMappingURL=enforcement.service.d.ts.map