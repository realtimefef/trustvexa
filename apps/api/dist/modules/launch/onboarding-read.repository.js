/**
 * Read/write access for onboarding task completion (task 9.4). One row per
 * completed task; completion is idempotent via a guarded insert so it does not
 * depend on a specific unique constraint. (Requirements 48.3, 48.4)
 */
import { query } from '@trustvexa/shared';
export async function completedTaskKeys(userId) {
    const res = await query(`SELECT task_key FROM onboarding_tasks WHERE user_id = $1`, [userId]);
    return res.rows.map((r) => r.task_key);
}
/** Mark a task complete, ignoring repeats (idempotent). */
export async function markTaskComplete(userId, taskKey) {
    await query(`INSERT INTO onboarding_tasks (user_id, task_key, completed_at)
     SELECT $1, $2, now()
      WHERE NOT EXISTS (
        SELECT 1 FROM onboarding_tasks WHERE user_id = $1 AND task_key = $2
      )`, [userId, taskKey]);
}
//# sourceMappingURL=onboarding-read.repository.js.map