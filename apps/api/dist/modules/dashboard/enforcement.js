// Middleman enforcement + critical-setting-change flow (task 7.3). Pure rules
// for the audited change pipeline: a critical change requires a reason, shows a
// preview, enters a cooldown before it applies, is auditable, and is
// rollback-able. Also scores the risk panel from raw flags.
// (Requirements 34.1-34.5, 39.x)
export const CRITICAL_SETTING_KEYS = [
    'fee_schedule',
    'payout_controls',
    'confirmation_thresholds',
    'withdrawal_limits',
    'emergency_pause',
    'trust_thresholds',
];
export const DEFAULT_COOLDOWN_MINUTES = 60;
export function isCriticalSetting(key) {
    return CRITICAL_SETTING_KEYS.includes(key);
}
/** Validate and plan a setting change (reason + preview + cooldown). */
export function planSettingChange(req, cooldownMinutes = DEFAULT_COOLDOWN_MINUTES) {
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
export function canApplyChange(status, cooldownElapsed) {
    if (status === 'pending')
        return true;
    if (status === 'cooling_down')
        return cooldownElapsed;
    return false;
}
/** Only an applied change can be rolled back. */
export function canRollback(status) {
    return status === 'applied';
}
function severityWeight(severity) {
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
/** Aggregate raw risk flags into the middleman risk panel summary. */
export function buildRiskPanel(flags) {
    if (flags.length === 0)
        return { score: 0, highestSeverity: 'none', flagCount: 0 };
    const score = flags.reduce((sum, f) => sum + severityWeight(f.severity), 0);
    const order = ['low', 'medium', 'high', 'critical'];
    let highest = 'low';
    for (const f of flags) {
        if (order.indexOf(f.severity) > order.indexOf(highest))
            highest = f.severity;
    }
    return { score, highestSeverity: highest, flagCount: flags.length };
}
//# sourceMappingURL=enforcement.js.map