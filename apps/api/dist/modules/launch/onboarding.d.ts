export type OnboardingTaskKey = 'verify_email' | 'complete_profile' | 'read_safety_guide' | 'first_practice_deal' | 'enable_2fa';
export interface OnboardingTask {
    key: OnboardingTaskKey;
    title: string;
    required: boolean;
}
export declare const ONBOARDING_TASKS: readonly OnboardingTask[];
export interface OnboardingProgress {
    completed: number;
    total: number;
    percent: number;
    remaining: OnboardingTaskKey[];
}
export declare function onboardingProgress(completedKeys: readonly OnboardingTaskKey[]): OnboardingProgress;
/** Onboarding is "complete" once every REQUIRED task is done. */
export declare function isOnboardingComplete(completedKeys: readonly OnboardingTaskKey[]): boolean;
//# sourceMappingURL=onboarding.d.ts.map