/**
 * Read-only persistence for the public platform-status page (Build Spec §3
 * "Support / misc").
 *
 * Active incident pauses are rows in `incident_pauses` that have started but
 * not yet ended (`ended_at IS NULL`). Feature flags are reported as-is. Real
 * columns from the migrations are used verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';
/** Currently-active incident pauses (started, not ended). */
export async function listActivePauses() {
    const res = await query(`SELECT scope, reason, started_at
       FROM incident_pauses
      WHERE ended_at IS NULL
      ORDER BY started_at DESC NULLS LAST`);
    return res.rows;
}
/** All feature flags, ordered by key for a stable response. */
export async function listFeatureFlags() {
    const res = await query(`SELECT flag_key, is_enabled, scope
       FROM feature_flags
      ORDER BY flag_key ASC`);
    return res.rows;
}
//# sourceMappingURL=status.repository.js.map