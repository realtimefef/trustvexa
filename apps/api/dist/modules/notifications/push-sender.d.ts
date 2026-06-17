export interface PushTarget {
    endpoint: string;
    p256dh: string;
    auth: string;
}
export interface PushSenderConfig {
    configured: true;
    send(target: PushTarget, payload: Record<string, unknown>): Promise<void>;
}
export interface PushSenderUnconfigured {
    configured: false;
}
export type PushSenderResult = PushSenderConfig | PushSenderUnconfigured;
/**
 * Return a push sender wired to the VAPID credentials in the environment.
 * Memoised — credentials are read once at first call.
 */
export declare function getPushSender(): PushSenderResult;
/** Test helper — reset the memoized config so tests can inject different env vars. */
export declare function resetPushSenderCache(): void;
//# sourceMappingURL=push-sender.d.ts.map