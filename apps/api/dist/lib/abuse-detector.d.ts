/**
 * Check if failed login attempts exceed 10 within 5 minutes for a given IP.
 * If so, flag as abuse in the abuse_flags table.
 */
export declare function checkFailedLoginAbuse(ip: string, _email: string): Promise<void>;
/**
 * Check if attempts on the same invite token exceed 5 within 1 hour for a user.
 * If so, flag as abuse.
 */
export declare function checkInviteCodeAbuse(userId: string, token: string): Promise<void>;
/**
 * Check if deal creations by a user exceed 20 within 24 hours.
 * If so, flag as abuse.
 */
export declare function checkDealCreationVelocity(userId: string): Promise<void>;
//# sourceMappingURL=abuse-detector.d.ts.map