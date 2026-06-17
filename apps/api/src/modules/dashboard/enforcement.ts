// Middleman enforcement + critical-setting-change flow (task 7.3). Pure rules
// for the audited change pipeline: a critical change requires a reason, shows a
// preview, enters a cooldown before it applies, is auditable, and is
// rollback-able. Also scores the risk panel from raw flags.
// (Requirements 34.1-34.5, 39.x)

export type SettingChangeStatus =
  | 'pending'
  | 'cooling_down'
  | 'applied'
  | 'rolled_back'
  | 'cancelled';

export const CRITICAL_SETTING_KEYS = [
  'fee_schedule',
  'payout_controls',
  'confirmation_thresholds',
  'withdrawal_limits',
  'emergency_pause',
  'trust_thresholds',
] as const;
export type CriticalSettingKey = (typeof CRITICAL_SETTING_KEYS)[number];

export const DEFAULT_COOLDOWN_MINUTES = 60;

export function isCriticalSetting(key: string): key is CriticalSettingKey {
  return (CRITICAL_SETTING_KEYS as readonly string[]).includes(key);
}

export interface SettingChangeRequest {
  settingKey: string;
  reason: string;
  oldValue: string;
  newValue: string;
}

export type SettingChangeError = 'reason_required' | 'no_change';

export interface SettingChangePlan {
  ok: boolean;
  error?: SettingChangeError;
  requiresCooldown: boolean;
  cooldownMinutes: number;
  /** Human-readable before/after preview. */
  preview: { from: string; to: string };
}

/** Validate and plan a setting change (reason + preview + cooldown). */
export function planSettingChange(
  req: SettingChangeRequest,
  cooldownMinutes = DEFAULT_COOLDOWN_MINUTES,
): SettingChangePlan {
  const preview = { from: req.oldValue, to: req.newValue };
  if (req.reason.trim().length === 0) {
    return {
      ok: false,
      error: 'reason_required',
      requiresCooldown: false,
      cooldownMinutes: 0,
      preview,
    };
  }
  if (req.oldValue === req.newValue) {
    return { ok: false, error: 'no_change', requiresCooldown: false, cooldownMinutes: 0, preview };
  }
  const critical = isCriticalSetting(req.settingKey);
  return {
    ok: true,
    requiresCooldown: critical,
    cooldownMinutes: critical ? cooldownMinutes : 0,
    preview,
  };
}

/** A change can apply only once its cooldown has elapsed. */
export function canApplyChange(status: SettingChangeStatus, cooldownElapsed: boolean): boolean {
  if (status === 'pending') return true;
  if (status === 'cooling_down') return cooldownElapsed;
  return false;
}

/** Only an applied change can be rolled back. */
export function canRollback(status: SettingChangeStatus): boolean {
  return status === 'applied';
}

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

function severityWeight(severity: RiskSeverity): number {
  switch (severity) {
    case 'low':
      return 1;
    case 'medium':
      return 3;
    case 'high':
      return 7;
    case 'critical':
      return 15;
  }
}

export interface RiskFlag {
  flagType: string;
  severity: RiskSeverity;
}

export interface RiskPanel {
  score: number;
  highestSeverity: RiskSeverity | 'none';
  flagCount: number;
}

/** Aggregate raw risk flags into the middleman risk panel summary. */
export function buildRiskPanel(flags: ReadonlyArray<RiskFlag>): RiskPanel {
  if (flags.length === 0) return { score: 0, highestSeverity: 'none', flagCount: 0 };
  const score = flags.reduce((sum, f) => sum + severityWeight(f.severity), 0);
  const order: RiskSeverity[] = ['low', 'medium', 'high', 'critical'];
  let highest: RiskSeverity = 'low';
  for (const f of flags) {
    if (order.indexOf(f.severity) > order.indexOf(highest)) highest = f.severity;
  }
  return { score, highestSeverity: highest, flagCount: flags.length };
}
