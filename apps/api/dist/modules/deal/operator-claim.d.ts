/** True when the user account is an operator (middleman) account. */
export declare function isOperatorAccount(userId: string): Promise<boolean>;
/**
 * If `userId` is an operator and the deal has no middleman yet, assign them as
 * the deal's middleman (and sync the linked connection so the chat reflects it).
 * Safe to call before any middleman control action; it is idempotent and only
 * ever fills an empty middleman slot.
 */
export declare function claimDealForOperator(userId: string, dealId: string): Promise<void>;
//# sourceMappingURL=operator-claim.d.ts.map