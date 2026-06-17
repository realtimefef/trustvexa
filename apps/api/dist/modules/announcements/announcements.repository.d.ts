export interface AnnouncementRow {
    id: string;
    title: string | null;
    body: string | null;
    audience: string | null;
    starts_at: Date | string | null;
    ends_at: Date | string | null;
    created_at: Date | string;
    read_at: Date | string | null;
}
/**
 * List currently-active announcements visible to `audience`, with the caller's
 * read timestamp. "Active" means the start window has opened (or is unset) and
 * the end window has not closed (or is unset). Audience matches `all`, the
 * caller's audience term, or an unset audience.
 */
export declare function listActiveForAudience(userId: string, audience: string): Promise<AnnouncementRow[]>;
/** Whether an announcement exists at all (visibility-independent). */
export declare function announcementExists(id: string): Promise<boolean>;
/**
 * Mark an announcement read for the caller, returning the (preserved) read
 * timestamp. Idempotent: a repeat keeps the original `read_at`.
 */
export declare function markAnnouncementRead(announcementId: string, userId: string): Promise<string>;
export declare function getAnnouncementForUser(announcementId: string, userId: string, audience: string): Promise<AnnouncementRow | null>;
//# sourceMappingURL=announcements.repository.d.ts.map