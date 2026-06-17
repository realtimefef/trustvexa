import { processEmail } from './email.js';
import { processNotificationFanout } from './notification-fanout.js';
import { processPayoutProcessing } from './payout-processing.js';
import { processMediaScan } from './media-scan.js';
import { processFxRefresh } from './fx-refresh.js';
import { processReconciliation } from './reconciliation.js';
import { processDeadLetter } from './dead-letter.js';
import { processWebhookDelivery } from './webhook-delivery.js';
import { processDbBackup } from './db-backup.js';
import { processEmailDigest } from './email-digest.js';
import { processIdempotencyCleanup } from './idempotency-cleanup.js';
export const PROCESSOR_REGISTRY = {
    email: processEmail,
    'notification-fanout': processNotificationFanout,
    'payout-processing': processPayoutProcessing,
    'media-scan': processMediaScan,
    'fx-refresh': processFxRefresh,
    reconciliation: processReconciliation,
    'dead-letter': processDeadLetter,
    'webhook-delivery': processWebhookDelivery,
    'db-backup': processDbBackup,
    'email-digest': processEmailDigest,
    'idempotency-cleanup': processIdempotencyCleanup,
};
//# sourceMappingURL=index.js.map