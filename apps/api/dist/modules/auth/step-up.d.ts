export interface StepUpChallenge {
    id: string;
    token: string;
    expiresAt: Date;
}
/** Create a short-lived step-up challenge for a sensitive action. */
export declare function createStepUpChallenge(userId: string, actionType: string, dealId?: string | null): Promise<StepUpChallenge>;
/** Validate and consume a step-up confirmation. Returns true on success. */
export declare function confirmStepUp(userId: string, actionType: string, token: string): Promise<boolean>;
//# sourceMappingURL=step-up.d.ts.map