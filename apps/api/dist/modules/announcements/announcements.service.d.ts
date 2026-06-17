export interface AnnouncementView {
    id: string;
    title: string | null;
    body: string | null;
    audience: string | null;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    read: boolean;
    readAt: string | null;
}
export interface MarkReadResult {
    announcementId: string;
    read: true;
    readAt: string;
}
/** Map a JWT role to the `announcements.audience` term it should see. */
export declare function audienceForRole(role: 'user' | 'middleman' | null): string;
export declare function listAnnouncements(userId: string, role: 'user' | 'middleman' | null): Promise<AnnouncementView[]>;
export declare function markRead(userId: string, announcementId: string): Promise<MarkReadResult>;
export declare function getAnnouncement(userId: string, announcementId: string, role: 'user' | 'middleman' | null): Promise<AnnouncementView>;
//# sourceMappingURL=announcements.service.d.ts.map