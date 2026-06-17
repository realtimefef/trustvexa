import { type RiskPanel, type RiskSeverity } from '../dashboard/enforcement.js';
export interface RiskFlagView {
    id: string;
    flagType: string;
    severity: RiskSeverity;
    details: string | null;
    createdAt: string;
}
export interface RiskPanelView {
    dealId: string;
    dealRiskScore: number | null;
    panel: RiskPanel;
    flags: RiskFlagView[];
}
export declare function getRiskPanel(middlemanId: string, dealId: string): Promise<RiskPanelView>;
export declare function getCriticalSettings(): {
    keys: readonly string[];
};
//# sourceMappingURL=risk.service.d.ts.map