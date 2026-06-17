/**
 * Worker-facing domain surface (companion to the `./deal-lifecycle` entry).
 *
 * The BullMQ worker (`@trustvexa/worker`) drives background jobs through the
 * very same domain modules the HTTP API uses, so money math, payout
 * authorization, FX selection, treasury reconciliation, notification fan-out,
 * dead-letter handling, and attachment scan persistence stay single-sourced.
 *
 * Importing the package root (`@trustvexa/api`) would start the HTTP server —
 * its entry calls `main()` — so the worker imports this side-effect-free
 * subpath instead. Each module is re-exported under its own namespace to keep
 * the surface explicit and collision-free (e.g. several repositories each
 * export a `TxClient` type).
 */
export * as fx from './modules/money/fx.js';
export * as fxRepo from './modules/money/fx.repository.js';
export * as payout from './modules/money/payout-queue.js';
export * as payoutRepo from './modules/money/payout-queue.repository.js';
export * as payoutPreflight from './modules/money/payout-preflight.js';
export * as reconciliation from './modules/treasury/reconciliation.js';
export * as treasuryRepo from './modules/treasury/treasury.repository.js';
export * as deadLetter from './modules/ops/dead-letter.js';
export * as deadLetterRepo from './modules/ops/dead-letter.repository.js';
export * as notifyEvents from './modules/notifications/notification-events.js';
export * as notifyPrefs from './modules/notifications/notification-prefs.js';
export * as notifyRepo from './modules/notifications/notification.repository.js';
export * as pushRepo from './modules/notifications/push.repository.js';
export * as attachmentRepo from './modules/chat/attachment.repository.js';
// ── deposit watcher (blockchain deposit monitoring) ──────────────────
// Pure confirmation thresholds + deposit classification, plus the deposit and
// escrow-address persistence the worker's deposit-watcher drives. Re-exported
// here so the watcher reuses the exact same money logic the HTTP API uses
// (single-sourced thresholds, classification, and idempotent crediting).
export * as confirmations from './modules/money/confirmations.js';
export * as depositClassification from './modules/money/deposit-classification.js';
export * as depositRepo from './modules/money/deposit.repository.js';
export * as escrowAddressRepo from './modules/money/escrow-address.repository.js';
export * as escrowAddressView from './modules/money/escrow-address.js';
// PII crypto helpers for worker notification routing
export { openPii, sealPii } from './modules/crypto/key-provider.js';
// Precision and coin unit formatters
export * as precision from './modules/money/precision.js';
export { triggerWebhook } from './modules/webhooks/webhook.service.js';
export { assertSafeWebhookTarget, isSafeWebhookUrl } from './modules/webhooks/webhook-url.js';
export { getObjectStorage } from './modules/storage/object-storage.js';
export { assertRuntimeConfig } from './modules/launch/config-validation.js';
export { getPushSender, resetPushSenderCache } from './modules/notifications/push-sender.js';
//# sourceMappingURL=worker-jobs.js.map