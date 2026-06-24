import type { PoolClient } from 'pg';
import type { AccountRole } from './jwt.js';
export interface UserRecord {
    id: string;
    username: string;
    account_type: AccountRole;
    account_status: string;
    account_label: string;
    password_hash: string | null;
    email_hash: string | null;
    email_enc: string | null;
    recovery_email_enc: string | null;
    totp_secret_enc?: string | null;
    totp_enabled?: boolean;
    totp_backup_codes_enc?: string | null;
}
export interface CreateUserInput {
    username: string;
    emailHash: string;
    emailEnc: string | null;
    signupDetailsEnc: string | null;
    passwordHash: string;
    accountType: AccountRole;
    ageConfirmed: boolean;
}
export declare function findUserByEmailHash(emailHash: string): Promise<UserRecord | null>;
export declare function findUserById(id: string): Promise<UserRecord | null>;
export declare function isUsernameTaken(username: string): Promise<boolean>;
export declare function isEmailTaken(emailHash: string): Promise<boolean>;
/**
 * Scrub all PII from a deleted account so nothing personal remains and — most
 * importantly — so the same email/recovery address can be used to register a
 * brand-new account. Clears both lookup hashes (email_hash is the uniqueness
 * key) and the encrypted blobs, and anonymizes the username.
 */
export declare function scrubDeletedUserPii(userId: string): Promise<void>;
export declare function isReservedName(value: string): Promise<boolean>;
export declare function getActivePolicyVersion(docType: string): Promise<string | null>;
export declare function createUser(input: CreateUserInput, policyAcceptances: Array<{
    docType: string;
    version: string;
}>): Promise<UserRecord>;
export declare function updatePasswordHash(userId: string, passwordHash: string): Promise<void>;
export interface CreateSessionInput {
    userId: string;
    device: string | null;
    ip: string | null;
    userAgent: string | null;
    rememberMe: boolean;
    expiresAt: Date;
}
export declare function createSession(input: CreateSessionInput): Promise<string>;
export declare function touchSession(sessionId: string): Promise<void>;
export declare function revokeSession(sessionId: string): Promise<void>;
export declare function revokeAllSessions(userId: string): Promise<void>;
export interface InsertRefreshInput {
    userId: string;
    sessionId: string;
    tokenHash: string;
    jti: string;
    audience: string;
    issuedAt: Date;
    expiresAt: Date;
}
export declare function insertRefreshToken(input: InsertRefreshInput): Promise<void>;
export interface RefreshTokenRecord {
    id: string;
    user_id: string;
    session_id: string | null;
    jwt_id: string | null;
    used_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
}
export declare function findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
export declare function markRefreshTokenConsumed(id: string): Promise<void>;
export declare function findRefreshTokenForUpdate(client: PoolClient, tokenHash: string): Promise<RefreshTokenRecord | null>;
export declare function markRefreshTokenConsumedTx(client: PoolClient, id: string): Promise<void>;
export declare function revokeSessionTx(client: PoolClient, sessionId: string): Promise<void>;
export declare function listActiveRefreshTokens(userId: string): Promise<Array<{
    jwt_id: string;
    expires_at: string | null;
}>>;
export declare function revokeAllRefreshTokens(userId: string): Promise<void>;
export declare function recordSecurityEvent(input: {
    userId: string;
    eventType: string;
    ip: string | null;
    device: string | null;
    metadata?: Record<string, unknown>;
}): Promise<void>;
export declare function recordLoginAttempt(input: {
    identifierHash: string | null;
    ip: string | null;
    success: boolean;
}): Promise<void>;
export declare function hasActiveLockout(identifierHash: string): Promise<boolean>;
export type SingleUseTokenType = 'email_verify' | 'password_reset' | 'recovery_email';
export interface SingleUseTokenRecord {
    id: string;
    user_id: string;
    token_type: string;
    used_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
}
export declare function insertSingleUseToken(input: {
    userId: string;
    tokenType: SingleUseTokenType;
    tokenHash: string;
    expiresAt: Date;
}): Promise<void>;
export declare function findSingleUseToken(tokenHash: string, tokenType: SingleUseTokenType): Promise<SingleUseTokenRecord | null>;
export declare function consumeSingleUseToken(id: string): Promise<void>;
export declare function revokeSingleUseTokensOfType(userId: string, tokenType: SingleUseTokenType): Promise<void>;
export interface StepUpRecord {
    id: string;
    user_id: string;
    action_type: string | null;
    deal_id: string | null;
    confirmed_at: string | null;
    expires_at: string | null;
}
export declare function insertStepUp(input: {
    userId: string;
    actionType: string;
    dealId: string | null;
    tokenHash: string;
    expiresAt: Date;
}): Promise<string>;
export declare function findStepUp(tokenHash: string, actionType: string): Promise<StepUpRecord | null>;
export declare function confirmStepUp(id: string): Promise<void>;
export declare function updateEmail(userId: string, emailHash: string, emailEnc: string | null): Promise<void>;
export declare function setRecoveryEmail(userId: string, recoveryEmailHash: string, recoveryEmailEnc: string | null): Promise<void>;
export declare function findUserByRecoveryEmailHash(hash: string): Promise<UserRecord | null>;
export declare function countRecentFailedAttempts(identifierHash: string, withinSeconds: number): Promise<number>;
export declare function createLockout(input: {
    userId: string | null;
    identifierHash: string;
    reason: string;
    lockedUntil: Date;
}): Promise<void>;
export interface SessionRecord {
    id: string;
    device: string | null;
    ip: string | null;
    user_agent: string | null;
    remember_me: boolean | null;
    last_seen_at: string | null;
    expires_at: string | null;
    revoked_at: string | null;
    created_at: string;
}
export declare function listActiveSessions(userId: string): Promise<SessionRecord[]>;
export declare function findSessionForUser(sessionId: string, userId: string): Promise<SessionRecord | null>;
export declare function revokeRefreshTokensForSession(sessionId: string): Promise<string[]>;
export interface SecurityEventRecord {
    id: string;
    event_type: string | null;
    ip: string | null;
    device: string | null;
    created_at: string;
}
export declare function listSecurityEvents(userId: string, limit?: number): Promise<SecurityEventRecord[]>;
export declare function setAccountStatus(userId: string, status: string): Promise<void>;
export declare function getUserAccountFlags(userId: string): Promise<{
    account_status: string;
    legal_hold: boolean;
} | null>;
export declare function countActiveDealsForUser(userId: string): Promise<number>;
export declare function insertDeactivation(userId: string, reason: string | null): Promise<void>;
export declare function markReactivated(userId: string): Promise<void>;
export declare function insertDeletionRequest(input: {
    userId: string;
    status: string;
    activeDealCount: number;
    userNotice: string | null;
}): Promise<string>;
export declare function insertAccountDeletion(input: {
    userId: string;
    requestedBy: string;
    reason: string | null;
    deletionType: string;
}): Promise<void>;
export declare function completeDeletionRequest(userId: string): Promise<void>;
export declare function countRecentRegistrationsByIp(ip: string, withinSeconds: number): Promise<number>;
export declare function acceptPolicy(userId: string, docType: string, version: string): Promise<void>;
export declare function updateTOTP(userId: string, secretEnc: string | null, enabled: boolean, backupCodesEnc: string | null): Promise<void>;
//# sourceMappingURL=auth.repository.d.ts.map