// Notification delivery decision: preferences, channels, quiet hours (task 6.9).
// Pure: given a user's preference for an (event_type, channel) plus quiet-hours
// config and the current local hour, decide whether to deliver now, suppress,
// or queue for after quiet hours. Important notifications bypass quiet hours.
// (Requirements 36.1, 36.2, 36.5)
/** Whether a given local hour falls within quiet hours (supports wrap past midnight). */
export function inQuietHours(localHour, quiet) {
    if (quiet.startHour === quiet.endHour)
        return false; // empty window
    if (quiet.startHour < quiet.endHour) {
        return localHour >= quiet.startHour && localHour < quiet.endHour;
    }
    // Wraps midnight, e.g. 22:00 -> 07:00.
    return localHour >= quiet.startHour || localHour < quiet.endHour;
}
/**
 * Decide what to do with a notification right now.
 * - Channel disabled -> suppress.
 * - Important -> always deliver (bypasses quiet hours).
 * - Normal during quiet hours -> queue until quiet hours end.
 * - Otherwise -> deliver.
 */
export function deliveryDecision(input) {
    if (!input.channelEnabled)
        return 'suppress_disabled';
    if (input.priority === 'important')
        return 'deliver';
    if (input.quiet && inQuietHours(input.localHour, input.quiet)) {
        return 'queue_quiet_hours';
    }
    return 'deliver';
}
/** Convenience boolean: should this notification be sent immediately? */
export function shouldDeliverNow(input) {
    return deliveryDecision(input) === 'deliver';
}
//# sourceMappingURL=notification-prefs.js.map