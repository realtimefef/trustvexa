import * as repo from './auth.repository.js';
export declare const SINGLE_USE_TTL_MS: Record<repo.SingleUseTokenType, number>;
export interface IssuedToken {
    token: string;
    expiresAt: Date;
}
/** Issue a single-use opaque token of the given type, persisting only its hash. */
export declare function issueSingleUseToken(userId: string, tokenType: repo.SingleUseTokenType): Promise<IssuedToken>;
export interface ConsumedToken {
    userId: string;
}
/** Validate and atomically consume a single-use token. Returns null when invalid. */
export declare function consumeSingleUseToken(token: string, tokenType: repo.SingleUseTokenType): Promise<ConsumedToken | null>;
//# sourceMappingURL=email-token.d.ts.map