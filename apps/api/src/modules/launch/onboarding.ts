// Onboarding tasks & guidance (task 9.4, Requirements 48.3, 48.4). Pure
// progress computation; completion is persisted in onboarding_tasks.

export type OnboardingTaskKey =
  | 'verify_email'
  | 'complete_profile'
  | 'read_safety_guide'
  | 'first_practice_deal'
  | 'enable_2fa';

export interface OnboardingTask {
  key: OnboardingTaskKey;
  title: string;
  required: boolean;
}

export const ONBOARDING_TASKS: readonly OnboardingTask[] = [
  { key: 'verify_email', title: 'Verify your email', required: true },
  { key: 'complete_profile', title: 'Complete your profile', required: true },
  { key: 'read_safety_guide', title: 'Read the escrow safety guide', required: true },
  { key: 'first_practice_deal', title: 'Try a practice deal on testnet', required: false },
  { key: 'enable_2fa', title: 'Enable two-factor authentication', required: false },
];

export interface OnboardingProgress {
  completed: number;
  total: number;
  percent: number;
  remaining: OnboardingTaskKey[];
}

export function onboardingProgress(
  completedKeys: readonly OnboardingTaskKey[],
): OnboardingProgress {
  const done = new Set(completedKeys);
  const total = ONBOARDING_TASKS.length;
  const completed = ONBOARDING_TASKS.filter((t) => done.has(t.key)).length;
  const remaining = ONBOARDING_TASKS.filter((t) => !done.has(t.key)).map((t) => t.key);
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  return { completed, total, percent, remaining };
}

/** Onboarding is "complete" once every REQUIRED task is done. */
export function isOnboardingComplete(completedKeys: readonly OnboardingTaskKey[]): boolean {
  const done = new Set(completedKeys);
  return ONBOARDING_TASKS.filter((t) => t.required).every((t) => done.has(t.key));
}
