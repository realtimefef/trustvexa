export interface SlaTick {
    remainingSeconds: number;
    breached: boolean;
    percentElapsed: number;
}
/** Seconds remaining until the deadline, clamped to >= 0. */
export declare function remainingSeconds(deadlineIso: string, nowIso: string): number;
/** True once the deadline has passed. */
export declare function isBreached(deadlineIso: string, nowIso: string): boolean;
/** Build a full tick payload given the window's start and deadline. */
export declare function slaTick(startIso: string, deadlineIso: string, nowIso: string): SlaTick;
/** Compute a deadline from a start time and an SLA duration in minutes. */
export declare function deadlineFrom(startIso: string, expectedMinutes: number): string;
//# sourceMappingURL=sla.d.ts.map