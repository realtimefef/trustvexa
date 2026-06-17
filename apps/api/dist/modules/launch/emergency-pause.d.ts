export type PauseScope = 'new_deals' | 'deposits' | 'payouts' | 'withdrawals' | 'signups' | 'chain';
export interface IncidentPause {
    scope: PauseScope;
    /** Set only when scope === 'chain'. */
    chain?: string | null;
    reason: string;
    startedAt: string;
    /** null while the pause is still active. */
    endedAt: string | null;
}
export type ProtectedAction = 'create_deal' | 'deposit' | 'payout' | 'withdrawal' | 'signup';
export declare function activePauses(pauses: readonly IncidentPause[]): IncidentPause[];
/**
 * Whether an action is currently blocked. A chain-scoped pause blocks
 * chain-bound actions (create_deal/deposit/payout/withdrawal) on that chain.
 */
export declare function isActionBlocked(pauses: readonly IncidentPause[], action: ProtectedAction, chain?: string | null): boolean;
/** Human-readable banner for the maintenance/incident notice, or null. */
export declare function pauseBanner(pauses: readonly IncidentPause[]): string | null;
//# sourceMappingURL=emergency-pause.d.ts.map