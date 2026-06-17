/**
 * Branded HTML email templates for TrustVexa.
 * Implements a shared base layout with premium dark mode styling and dynamic variable injection.
 */
export declare function getWelcomeEmail(data: {
    username: string;
    loginUrl: string;
    unsubscribeUrl?: string;
}): string;
export declare function getVerifyEmail(data: {
    username: string;
    verifyUrl: string;
    unsubscribeUrl?: string;
}): string;
export declare function getPasswordResetEmail(data: {
    username: string;
    resetUrl: string;
    unsubscribeUrl?: string;
}): string;
export declare function getNewDeviceLoginEmail(data: {
    username: string;
    device: string;
    ip: string;
    time: string;
    unsubscribeUrl?: string;
}): string;
export declare function getDealFundedEmail(data: {
    username: string;
    dealTitle: string;
    dealUrl: string;
    amount: string;
    coin: string;
    unsubscribeUrl?: string;
}): string;
export declare function getPayoutSentEmail(data: {
    username: string;
    dealTitle: string;
    payoutUrl: string;
    amount: string;
    coin: string;
    txHash: string;
    unsubscribeUrl?: string;
}): string;
export declare function getSlaWarningEmail(data: {
    username: string;
    dealTitle: string;
    dealUrl: string;
    hoursLeft: number;
    unsubscribeUrl?: string;
}): string;
export declare function getDisputeOpenedEmail(data: {
    username: string;
    dealTitle: string;
    disputeUrl: string;
    reason: string;
    unsubscribeUrl?: string;
}): string;
export interface DigestNotification {
    type: string;
    dealTitle?: string | undefined;
    summary: string;
    createdAt: string;
}
export declare function getDigestEmail(data: {
    username: string;
    frequency: 'daily' | 'weekly';
    notifications: DigestNotification[];
    dashboardUrl: string;
    unsubscribeUrl?: string;
}): string;
//# sourceMappingURL=index.d.ts.map