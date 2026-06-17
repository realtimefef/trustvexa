export type NotificationChannel = 'email' | 'in_app';
export type NotificationPriority = 'normal' | 'important';
export interface QuietHours {
    /** Local hour [0-23] when quiet hours begin. */
    startHour: number;
    /** Local hour [0-23] when quiet hours end. */
    endHour: number;
}
/** Whether a given local hour falls within quiet hours (supports wrap past midnight). */
export declare function inQuietHours(localHour: number, quiet: QuietHours): boolean;
export interface DeliveryInput {
    channelEnabled: boolean;
    priority: NotificationPriority;
    localHour: number;
    quiet?: QuietHours | null;
}
export type DeliveryDecision = 'deliver' | 'suppress_disabled' | 'queue_quiet_hours';
/**
 * Decide what to do with a notification right now.
 * - Channel disabled -> suppress.
 * - Important -> always deliver (bypasses quiet hours).
 * - Normal during quiet hours -> queue until quiet hours end.
 * - Otherwise -> deliver.
 */
export declare function deliveryDecision(input: DeliveryInput): DeliveryDecision;
/** Convenience boolean: should this notification be sent immediately? */
export declare function shouldDeliverNow(input: DeliveryInput): boolean;
//# sourceMappingURL=notification-prefs.d.ts.map