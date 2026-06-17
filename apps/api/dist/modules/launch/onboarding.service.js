/**
 * Onboarding service (task 9.4). Composes persisted task completion with the
 * pure progress logic so the UI can render a checklist with a percent-complete
 * and a required-tasks gate. Marking a task is idempotent. (Requirements 48.3,
 * 48.4)
 */
import { isOnboardingComplete, onboardingProgress, ONBOARDING_TASKS, } from './onboarding.js';
import { completedTaskKeys, markTaskComplete } from './onboarding-read.repository.js';
async function buildView(userId) {
    const done = await completedTaskKeys(userId);
    const doneSet = new Set(done);
    return {
        tasks: ONBOARDING_TASKS.map((t) => ({
            key: t.key,
            title: t.title,
            required: t.required,
            done: doneSet.has(t.key),
        })),
        progress: onboardingProgress(done),
        complete: isOnboardingComplete(done),
    };
}
export async function getOnboarding(userId) {
    return buildView(userId);
}
export async function completeTask(userId, taskKey) {
    await markTaskComplete(userId, taskKey);
    return buildView(userId);
}
//# sourceMappingURL=onboarding.service.js.map