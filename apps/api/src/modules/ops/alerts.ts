// Monitoring alert rules (task 9.2, Requirements 45.1, 45.2, 45.3, 45.4).
// Pure threshold evaluation over a metrics snapshot.

export type AlertType =
  | 'low_gas'
  | 'queue_backlog'
  | 'failed_payouts'
  | 'chain_reorg'
  | 'reconciliation_mismatch'
  | 'security_breach';

export type Severity = 'info' | 'warning' | 'critical';

export interface AlertThresholds {
  /** Minimum acceptable hot-wallet gas balance, in USD cents, per chain. */
  minGasCents: bigint;
  /** Queue depth above which we warn. */
  queueBacklogWarn: number;
  /** Queue depth above which we page (critical). */
  queueBacklogCritical: number;
  /** Failed payouts in the window above which we alert. */
  failedPayoutsThreshold: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  minGasCents: 5_000n, // $50
  queueBacklogWarn: 100,
  queueBacklogCritical: 1000,
  failedPayoutsThreshold: 1,
};

export interface MetricsSnapshot {
  gasByChainCents: Readonly<Record<string, bigint>>;
  queueDepth: number;
  failedPayouts: number;
  reorgDetected: boolean;
  reconciliationMismatch: boolean;
  breachDetected: boolean;
}

export interface Alert {
  type: AlertType;
  severity: Severity;
  message: string;
}

export function evaluateAlerts(
  metrics: MetricsSnapshot,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
): Alert[] {
  const alerts: Alert[] = [];

  for (const [chain, balance] of Object.entries(metrics.gasByChainCents)) {
    if (balance < thresholds.minGasCents) {
      alerts.push({
        type: 'low_gas',
        severity: 'warning',
        message: `Low gas on ${chain}: ${balance} cents below floor ${thresholds.minGasCents}`,
      });
    }
  }

  if (metrics.queueDepth >= thresholds.queueBacklogCritical) {
    alerts.push({
      type: 'queue_backlog',
      severity: 'critical',
      message: `Queue backlog critical: ${metrics.queueDepth} jobs`,
    });
  } else if (metrics.queueDepth >= thresholds.queueBacklogWarn) {
    alerts.push({
      type: 'queue_backlog',
      severity: 'warning',
      message: `Queue backlog elevated: ${metrics.queueDepth} jobs`,
    });
  }

  if (metrics.failedPayouts >= thresholds.failedPayoutsThreshold) {
    alerts.push({
      type: 'failed_payouts',
      severity: 'critical',
      message: `${metrics.failedPayouts} failed payout(s) need attention`,
    });
  }

  if (metrics.reorgDetected) {
    alerts.push({
      type: 'chain_reorg',
      severity: 'critical',
      message: 'Chain reorg detected; affected deposits returned to awaiting-funds',
    });
  }

  if (metrics.reconciliationMismatch) {
    alerts.push({
      type: 'reconciliation_mismatch',
      severity: 'critical',
      message: 'Ledger vs on-chain reconciliation mismatch',
    });
  }

  if (metrics.breachDetected) {
    alerts.push({
      type: 'security_breach',
      severity: 'critical',
      message: 'Potential security breach detected; incident-response plan engaged',
    });
  }

  return alerts;
}

/** The highest severity present, or null when there are no alerts. */
export function highestSeverity(alerts: readonly Alert[]): Severity | null {
  let rank = 0;
  const order: Record<Severity, number> = { info: 1, warning: 2, critical: 3 };
  let result: Severity | null = null;
  for (const a of alerts) {
    if (order[a.severity] > rank) {
      rank = order[a.severity];
      result = a.severity;
    }
  }
  return result;
}
