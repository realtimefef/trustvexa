// Onboarding tasks & guidance (task 9.4, Requirements 48.3, 48.4). Pure
// progress computation; completion is persisted in onboarding_tasks.
export const ONBOARDING_TASKS = [
    { key: 'verify_email', title: 'Verify your email', required: true },
    { key: 'complete_profile', title: 'Complete your profile', required: true },
    { key: 'read_safety_guide', title: 'Read the escrow safety guide', required: true },
    { key: 'first_practice_deal', title: 'Try a practice deal on testnet', required: false },
    { key: 'enable_2fa', title: 'Enable two-factor authentication', required: false },
];
export function onboardingProgress(completedKeys) {
    const done = new Set(completedKeys);
    const total = ONBOARDING_TASKS.length;
    const completed = ONBOARDING_TASKS.filter((t) => done.has(t.key)).length;
    const remaining = ONBOARDING_TASKS.filter((t) => !done.has(t.key)).map((t) => t.key);
    const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
    return { completed, total, percent, remaining };
}
/** Onboarding is "complete" once every REQUIRED task is done. */
export function isOnboardingComplete(completedKeys) {
    const done = new Set(completedKeys);
    return ONBOARDING_TASKS.filter((t) => t.required).every((t) => done.has(t.key));
}
//# sourceMappingURL=onboarding.js.map