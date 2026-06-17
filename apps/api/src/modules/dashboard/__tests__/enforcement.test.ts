import { describe, expect, it } from 'vitest';

import {
  buildRiskPanel,
  canApplyChange,
  canRollback,
  CRITICAL_SETTING_KEYS,
  isCriticalSetting,
  planSettingChange,
  type RiskFlag,
} from '../enforcement.js';

describe('planSettingChange', () => {
  it('requires a non-empty reason', () => {
    const plan = planSettingChange({
      settingKey: 'fee_schedule',
      reason: '   ',
      oldValue: 'a',
      newValue: 'b',
    });
    expect(plan.ok).toBe(false);
    expect(plan.error).toBe('reason_required');
  });

  it('rejects a no-op change', () => {
    const plan = planSettingChange({
      settingKey: 'fee_schedule',
      reason: 'tune',
      oldValue: 'same',
      newValue: 'same',
    });
    expect(plan.ok).toBe(false);
    expect(plan.error).toBe('no_change');
  });

  it('requires a cooldown for critical keys and previews the diff', () => {
    const plan = planSettingChange({
      settingKey: 'payout_controls',
      reason: 'raise cap',
      oldValue: '100',
      newValue: '200',
    });
    expect(plan.ok).toBe(true);
    expect(plan.requiresCooldown).toBe(true);
    expect(plan.cooldownMinutes).toBeGreaterThan(0);
    expect(plan.preview).toEqual({ from: '100', to: '200' });
  });

  it('does not require a cooldown for a non-critical key', () => {
    const plan = planSettingChange({
      settingKey: 'support_email',
      reason: 'update',
      oldValue: 'a@x.com',
      newValue: 'b@x.com',
    });
    expect(plan.ok).toBe(true);
    expect(plan.requiresCooldown).toBe(false);
  });
});

describe('isCriticalSetting', () => {
  it('recognises exactly the six critical keys', () => {
    for (const key of CRITICAL_SETTING_KEYS) {
      expect(isCriticalSetting(key)).toBe(true);
    }
    expect(isCriticalSetting('support_email')).toBe(false);
  });
});

describe('canApplyChange / canRollback', () => {
  it('applies a pending change immediately and a cooling change only after cooldown', () => {
    expect(canApplyChange('pending', false)).toBe(true);
    expect(canApplyChange('cooling_down', false)).toBe(false);
    expect(canApplyChange('cooling_down', true)).toBe(true);
    expect(canApplyChange('applied', true)).toBe(false);
  });

  it('rolls back only an applied change', () => {
    expect(canRollback('applied')).toBe(true);
    expect(canRollback('pending')).toBe(false);
    expect(canRollback('rolled_back')).toBe(false);
  });
});

describe('buildRiskPanel', () => {
  it('returns an empty panel for no flags', () => {
    expect(buildRiskPanel([])).toEqual({ score: 0, highestSeverity: 'none', flagCount: 0 });
  });

  it('weights severities and reports the highest', () => {
    const flags: RiskFlag[] = [
      { flagType: 'new_user', severity: 'low' },
      { flagType: 'wallet_change', severity: 'high' },
      { flagType: 'fraud', severity: 'critical' },
    ];
    const panel = buildRiskPanel(flags);
    expect(panel.flagCount).toBe(3);
    expect(panel.highestSeverity).toBe('critical');
    expect(panel.score).toBe(1 + 7 + 15);
  });
});
