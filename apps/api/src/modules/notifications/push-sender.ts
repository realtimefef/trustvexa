/**
 * Web-push delivery helper using the `web-push` library with VAPID auth.
 *
 * Reads VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY from environment at first use.
 * Returns { configured: false } when the keys are absent so the caller (the
 * worker's push adapter) can log a warning and skip delivery rather than crash.
 * (Requirement 36.4)
 */
import webPush from 'web-push';

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

let _config: PushSenderResult | null = null;

/**
 * Return a push sender wired to the VAPID credentials in the environment.
 * Memoised — credentials are read once at first call.
 */
export function getPushSender(): PushSenderResult {
  if (_config !== null) return _config;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? `mailto:${process.env.MAIL_FROM ?? 'admin@trustvexa.com'}`;

  if (!publicKey || !privateKey) {
    _config = { configured: false };
    return _config;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);

  _config = {
    configured: true,
    async send(target: PushTarget, payload: Record<string, unknown>): Promise<void> {
      const subscription: webPush.PushSubscription = {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      };
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    },
  };

  return _config;
}

/** Test helper — reset the memoized config so tests can inject different env vars. */
export function resetPushSenderCache(): void {
  _config = null;
}
