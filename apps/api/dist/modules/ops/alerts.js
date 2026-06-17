// Monitoring alert rules (task 9.2, Requirements 45.1, 45.2, 45.3, 45.4).
// Pure threshold evaluation over a metrics snapshot.
export const DEFAULT_THRESHOLDS = {
    minGasCents: 5000n, // $50
    queueBacklogWarn: 100,
    queueBacklogCritical: 1000,
    failedPayoutsThreshold: 1,
};
export function evaluateAlerts(metrics, thresholds = DEFAULT_THRESHOLDS) {
    const alerts = [];
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
    }
    else if (metrics.queueDepth >= thresholds.queueBacklogWarn) {
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
export function highestSeverity(alerts) {
    let rank = 0;
    const order = { info: 1, warning: 2, critical: 3 };
    let result = null;
    for (const a of alerts) {
        if (order[a.severity] > rank) {
            rank = order[a.severity];
            result = a.severity;
        }
    }
    return result;
}
//# sourceMappingURL=alerts.js.map