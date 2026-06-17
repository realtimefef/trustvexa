/**
 * Platform-status service (Build Spec §3 "Support / misc").
 *
 * Read-only and intentionally simple: the overall status is `degraded` when any
 * incident pause is active, otherwise `operational`. The response lists the
 * paused scopes (with their reason and start time) and the current feature
 * flags so the status page can render per-scope detail.
 */
import {
  listActivePauses,
  listFeatureFlags,
  type ActivePauseRow,
  type FeatureFlagRow,
} from './status.repository.js';

export type OverallStatus = 'operational' | 'degraded';

export interface PausedScopeView {
  scope: string;
  reason: string | null;
  since: string | null;
}

export interface FeatureFlagView {
  flagKey: string;
  isEnabled: boolean;
  scope: string | null;
}

export interface PlatformStatusView {
  status: OverallStatus;
  pausedScopes: PausedScopeView[];
  featureFlags: FeatureFlagView[];
  checkedAt: string;
}

function toIso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toPausedScope(row: ActivePauseRow): PausedScopeView {
  return { scope: row.scope, reason: row.reason, since: toIso(row.started_at) };
}

function toFlagView(row: FeatureFlagRow): FeatureFlagView {
  return { flagKey: row.flag_key, isEnabled: row.is_enabled, scope: row.scope };
}

export async function getPlatformStatus(): Promise<PlatformStatusView> {
  const [pauses, flags] = await Promise.all([listActivePauses(), listFeatureFlags()]);
  return {
    status: pauses.length > 0 ? 'degraded' : 'operational',
    pausedScopes: pauses.map(toPausedScope),
    featureFlags: flags.map(toFlagView),
    checkedAt: new Date().toISOString(),
  };
}
