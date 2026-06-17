import { Queue } from 'bullmq';
import { createRedisConnection } from '@trustvexa/shared/redis';
let emailQueue = null;
let notificationQueue = null;
let payoutQueue = null;
let webhookQueue = null;
export function getEmailQueue() {
    if (!emailQueue) {
        emailQueue = new Queue('email', { connection: createRedisConnection() });
    }
    return emailQueue;
}
export function getNotificationQueue() {
    if (!notificationQueue) {
        notificationQueue = new Queue('notification-fanout', { connection: createRedisConnection() });
    }
    return notificationQueue;
}
export function getPayoutQueue() {
    if (!payoutQueue) {
        payoutQueue = new Queue('payout-processing', { connection: createRedisConnection() });
    }
    return payoutQueue;
}
export function getWebhookQueue() {
    if (!webhookQueue) {
        webhookQueue = new Queue('webhook-delivery', { connection: createRedisConnection() });
    }
    return webhookQueue;
}
export async function enqueueWebhookDelivery(args) {
    const queue = getWebhookQueue();
    // Retry transient delivery failures with exponential backoff so a momentary
    // receiver outage does not silently drop the event. Exhausted jobs remain in
    // the failed set for inspection / dead-letter handling. (Re-audit FIX-8)
    await queue.add('webhook-deliver', args, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: false,
    });
}
export async function enqueueEmail(args) {
    const queue = getEmailQueue();
    await queue.add(args.templateName, {
        to: args.to,
        templateName: args.templateName,
        templateData: args.templateData,
    });
}
export async function enqueueNotificationFanout(args) {
    const queue = getNotificationQueue();
    await queue.add(args.eventType, {
        eventType: args.eventType,
        dealId: args.dealId,
        recipientUserIds: args.recipientUserIds,
        payload: args.payload,
    });
}
export async function enqueuePayoutProcessing(args) {
    const queue = getPayoutQueue();
    await queue.add(`${args.action}-${args.payoutId}`, {
        payoutId: args.payoutId,
        expectedVersion: args.expectedVersion,
        action: args.action,
        coin: args.coin,
        network: args.network,
        toAddress: args.toAddress,
        amountSmallestUnit: args.amountSmallestUnit,
    }, {
        // Retry transient chain/RPC failures with exponential backoff. The
        // optimistic version check in the processor makes the broadcast safe to
        // retry (a concurrent writer that already advanced the row is detected
        // and skipped). (Re-audit FIX-8)
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 1000,
        removeOnFail: false,
    });
}
//# sourceMappingURL=queue.js.map