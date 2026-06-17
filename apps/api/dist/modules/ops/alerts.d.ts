export type AlertType = 'low_gas' | 'queue_backlog' | 'failed_payouts' | 'chain_reorg' | 'reconciliation_mismatch' | 'security_breach';
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
export declare const DEFAULT_THRESHOLDS: AlertThresholds;
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
export declare function evaluateAlerts(metrics: MetricsSnapshot, thresholds?: AlertThresholds): Alert[];
/** The highest severity present, or null when there are no alerts. */
export declare function highestSeverity(alerts: readonly Alert[]): Severity | null;
//# sourceMappingURL=alerts.d.ts.map