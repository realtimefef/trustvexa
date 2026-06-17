import { Queue } from 'bullmq';
import { notifyEvents, notifyRepo, pushRepo, openPii } from '@trustvexa/api/worker-jobs';
import { createRedisConnection } from '@trustvexa/shared/redis';
import { parseNotificationFanoutJob } from '../payloads.js';
export async function processNotificationFanout(job, ctx) {
    const data = parseNotificationFanoutJob(job.data);
    const nowIso = new Date().toISOString();
    const priority = notifyEvents.defaultPriorityFor(data.eventType);
    const envelope = notifyEvents.buildPublishEnvelope({
        eventType: data.eventType,
        dealId: data.dealId,
        recipientUserIds: data.recipientUserIds,
        priority,
        payload: data.payload,
        nowIso,
    });
    const emailQueue = new Queue('email', { connection: createRedisConnection() });
    try {
        await ctx.withTransaction(async (tx) => {
            for (const userId of envelope.recipientUserIds) {
                const inAppEnabled = await notifyRepo.isChannelEnabled(tx, userId, data.eventType, 'in_app');
                // Check if email channel is enabled
                const emailEnabled = await notifyRepo.isChannelEnabled(tx, userId, data.eventType, 'email');
                const prefRes = await tx.query(`SELECT email_digest_frequency FROM user_preferences WHERE user_id = $1`, [userId]);
                const frequency = prefRes.rows[0]?.email_digest_frequency ?? 'immediate';
                const isDigest = frequency === 'daily' || frequency === 'weekly';
                // Insert notification if in_app is enabled OR if email digest is enabled (so it accumulates)
                if (inAppEnabled || (emailEnabled && isDigest)) {
                    await notifyRepo.insertNotification(tx, {
                        userId,
                        dealId: data.dealId,
                        type: data.eventType,
                        payload: data.payload,
                        priority,
                    });
                }
                if (emailEnabled && !isDigest) {
                    // Send immediate email
                    const userRes = await tx.query(`SELECT email_enc, username FROM users WHERE id = $1`, [userId]);
                    const user = userRes.rows[0];
                    if (user) {
                        const email = user.email_enc ? await openPii(user.email_enc) : null;
                        if (email) {
                            let dealTitle = 'Your Deal';
                            if (data.dealId) {
                                const dealRes = await tx.query(`SELECT title FROM deals WHERE id = $1`, [data.dealId]);
                                if (dealRes.rows[0]?.title) {
                                    dealTitle = dealRes.rows[0].title;
                                }
                            }
                            let templateName = null;
                            let templateData = {};
                            if (data.eventType === 'payment:received') {
                                templateName = 'deal-funded';
                                templateData = {
                                    username: user.username,
                                    dealTitle,
                                    dealUrl: `https://trustvexa.com/deals/${data.dealId}`,
                                    amount: data.payload.amount || '0',
                                    coin: data.payload.coin || '',
                                };
                            }
                            else if (data.eventType === 'payout:update') {
                                templateName = 'payout-sent';
                                templateData = {
                                    username: user.username,
                                    dealTitle,
                                    payoutUrl: `https://trustvexa.com/deals/${data.dealId}`,
                                    amount: data.payload.amount || '0',
                                    coin: data.payload.coin || '',
                                    txHash: data.payload.txHash || '',
                                };
                            }
                            else if (data.eventType === 'sla:warning') {
                                templateName = 'sla-warning';
                                templateData = {
                                    username: user.username,
                                    dealTitle,
                                    dealUrl: `https://trustvexa.com/deals/${data.dealId}`,
                                    hoursLeft: data.payload.hoursLeft || 0,
                                };
                            }
                            else if (data.eventType === 'dispute:update') {
                                templateName = 'dispute-opened';
                                templateData = {
                                    username: user.username,
                                    dealTitle,
                                    disputeUrl: `https://trustvexa.com/deals/${data.dealId}`,
                                    reason: data.payload.reason || '',
                                };
                            }
                            if (templateName) {
                                await emailQueue.add(templateName, {
                                    to: email,
                                    templateName,
                                    templateData,
                                });
                            }
                        }
                    }
                }
            }
        });
    }
    finally {
        await emailQueue.close();
    }
    if (!ctx.adapters.push.configured) {
        ctx.logger.warn({ event_type: data.eventType, recipients: envelope.recipientUserIds.length }, 'push delivery skipped: sender not configured');
        return;
    }
    for (const userId of envelope.recipientUserIds) {
        const subscriptions = await pushRepo.activeSubscriptions(ctx.db, userId);
        for (const sub of subscriptions) {
            try {
                await ctx.adapters.push.send({ endpoint: sub.endpoint, p256dh: sub.p256dh_key, auth: sub.auth_key }, {
                    eventType: envelope.eventType,
                    dealId: envelope.dealId,
                    payload: envelope.payload,
                });
            }
            catch (err) {
                ctx.logger.warn({
                    user_id: userId,
                    endpoint: sub.endpoint,
                    err: err instanceof Error ? err.message : String(err),
                }, 'push delivery failed for subscription');
            }
        }
    }
}
//# sourceMappingURL=notification-fanout.js.map