export interface AssignedDealRow {
    risk_score: number | null;
}
/** Returns the deal's risk score only when it is assigned to this middleman. */
export declare function getAssignedDeal(dealId: string, middlemanId: string): Promise<AssignedDealRow | null>;
export interface RiskFlagRow {
    id: string;
    flag_type: string;
    severity: string | null;
    details: string | null;
    created_at: Date | string;
}
export declare function listRiskFlags(dealId: string): Promise<RiskFlagRow[]>;
//# sourceMappingURL=risk-read.repository.d.ts.map