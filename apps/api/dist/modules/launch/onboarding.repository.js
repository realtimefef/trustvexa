export async function markTaskComplete(tx, userId, taskKey) {
    await tx.query(`INSERT INTO onboarding_tasks (user_id, task_key, completed_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (user_id, task_key) DO NOTHING`, [userId, taskKey]);
}
export async function completedTaskKeys(tx, userId) {
    const { rows } = await tx.query(`SELECT task_key FROM onboarding_tasks WHERE user_id = $1`, [userId]);
    return rows.map((r) => r.task_key);
}
//# sourceMappingURL=onboarding.repository.js.map