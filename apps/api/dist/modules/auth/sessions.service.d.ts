export interface SessionView {
    id: string;
    device: string | null;
    ip: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    expiresAt: string | null;
    current: boolean;
}
export declare function listSessions(userId: string, currentSessionId: string | null): Promise<SessionView[]>;
export declare function revokeSession(userId: string, sessionId: string): Promise<void>;
export interface SecurityEventView {
    id: string;
    eventType: string | null;
    ip: string | null;
    device: string | null;
    createdAt: string;
}
export declare function listSecurityEvents(userId: string): Promise<SecurityEventView[]>;
//# sourceMappingURL=sessions.service.d.ts.map