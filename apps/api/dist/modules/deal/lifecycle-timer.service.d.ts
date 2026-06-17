/** 3-day Completion_Clock (Requirement 14.1). */
export declare const COMPLETION_CLOCK_DAYS = 3;
/**
 * Window durations. The plan fixes the completion clock at 3 days; the
 * inspection and funding windows are operationally tunable, so they default
 * here and may be overridden via the environment without a code change.
 */
export declare function inspectionWindowHours(): number;
export declare function fundingWindowHours(): number;
export interface LifecycleTimerSummary {
    readonly fundingExpired: number;
    readonly completionExpired: number;
    readonly inspectionReleased: number;
    readonly trustLowered: number;
    readonly skipped: number;
    readonly failed: number;
}
export interface RunLifecycleTimersArgs {
    readonly now?: Date;
}
export declare function runLifecycleTimers(args?: RunLifecycleTimersArgs): Promise<LifecycleTimerSummary>;
/** Start/refresh the funding window (14.9). */
export declare function startFundingWindow(dealId: string, now?: Date): Promise<void>;
/** Start the 3-day completion clock when the middleman is contacted (14.1). */
export declare function startCompletionClock(dealId: string, now?: Date): Promise<void>;
/** Start the inspection window when the seller marks Delivered (14.6). */
export declare function startInspectionWindow(dealId: string, now?: Date): Promise<void>;
//# sourceMappingURL=lifecycle-timer.service.d.ts.map