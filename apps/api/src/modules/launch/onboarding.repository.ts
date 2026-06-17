// Persistence for onboarding_tasks (task 9.4). One row per completed task.
// Not barrel-exported.
import type { OnboardingTaskKey } from './onboarding.js';

export interface TxClient {
  query<R>(
    text: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export async function markTaskComplete(
  tx: TxClient,
  userId: string,
  taskKey: OnboardingTaskKey,
): Promise<void> {
  await tx.query(
    `INSERT INTO onboarding_tasks (user_id, task_key, completed_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (user_id, task_key) DO NOTHING`,
    [userId, taskKey],
  );
}

export async function completedTaskKeys(
  tx: TxClient,
  userId: string,
): Promise<OnboardingTaskKey[]> {
  const { rows } = await tx.query<{ task_key: OnboardingTaskKey }>(
    `SELECT task_key FROM onboarding_tasks WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.task_key);
}
