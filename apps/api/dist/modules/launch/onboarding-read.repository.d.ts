import type { OnboardingTaskKey } from './onboarding.js';
export declare function completedTaskKeys(userId: string): Promise<OnboardingTaskKey[]>;
/** Mark a task complete, ignoring repeats (idempotent). */
export declare function markTaskComplete(userId: string, taskKey: OnboardingTaskKey): Promise<void>;
//# sourceMappingURL=onboarding-read.repository.d.ts.map