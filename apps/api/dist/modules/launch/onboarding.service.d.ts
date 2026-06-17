/**
 * Onboarding service (task 9.4). Composes persisted task completion with the
 * pure progress logic so the UI can render a checklist with a percent-complete
 * and a required-tasks gate. Marking a task is idempotent. (Requirements 48.3,
 * 48.4)
 */
import { type OnboardingProgress, type OnboardingTaskKey } from './onboarding.js';
export interface OnboardingTaskView {
    key: OnboardingTaskKey;
    title: string;
    required: boolean;
    done: boolean;
}
export interface OnboardingView {
    tasks: OnboardingTaskView[];
    progress: OnboardingProgress;
    complete: boolean;
}
export declare function getOnboarding(userId: string): Promise<OnboardingView>;
export declare function completeTask(userId: string, taskKey: OnboardingTaskKey): Promise<OnboardingView>;
//# sourceMappingURL=onboarding.service.d.ts.map