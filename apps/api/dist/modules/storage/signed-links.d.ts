export declare function generateSignedLink(fileId: string, userId: string, ttlSeconds?: number): {
    url: string;
    expiresAt: Date;
    token: string;
};
export declare function verifySignedToken(token: string): {
    fileId: string;
    userId: string;
} | null;
//# sourceMappingURL=signed-links.d.ts.map