import nodemailer from 'nodemailer';
import { getPushSender } from '@trustvexa/api/worker-jobs';
export class IntegrationNotConfiguredError extends Error {
    integration;
    constructor(integration, detail) {
        super(`integration_not_configured:${integration}${detail ? ` (${detail})` : ''}`);
        this.name = 'IntegrationNotConfiguredError';
        this.integration = integration;
    }
}
function unconfigured(integration, detail) {
    throw new IntegrationNotConfiguredError(integration, detail);
}
/**
 * Default adapter bundle: every seam reports `configured: false` and throws on
 * use. Real implementations are injected once the operator provisions
 * credentials (SMTP, VAPID, chain RPC + signer, FX provider, scanner, KEK).
 */
export function createDefaultAdapters() {
    const mailHost = process.env.MAIL_HOST;
    const mailPort = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : undefined;
    const mailUser = process.env.MAIL_USER;
    const mailPassword = process.env.MAIL_PASSWORD;
    const mailFrom = process.env.MAIL_FROM || 'noreply@trustvexa.com';
    const mailerConfigured = !!(mailHost && mailPort);
    let transporter = null;
    if (mailerConfigured) {
        transporter = nodemailer.createTransport({
            host: mailHost,
            port: mailPort,
            secure: mailPort === 465,
            auth: mailUser && mailPassword
                ? {
                    user: mailUser,
                    pass: mailPassword,
                }
                : undefined,
        });
    }
    return {
        mailer: {
            configured: mailerConfigured,
            send: async (message) => {
                if (!mailerConfigured || !transporter) {
                    unconfigured('mailer', 'MAIL_* credentials');
                }
                await transporter.sendMail({
                    from: mailFrom,
                    to: message.to,
                    subject: message.subject,
                    html: message.html,
                    text: message.text,
                });
            },
        },
        push: (() => {
            const sender = getPushSender();
            if (!sender.configured) {
                return {
                    configured: false,
                    send: () => unconfigured('push', 'VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY'),
                };
            }
            return {
                configured: true,
                send: sender.send.bind(sender),
            };
        })(),
        chain: {
            configured: false,
            broadcast: () => unconfigured('chain', 'per-chain RPC endpoint + signer'),
        },
        fx: {
            configured: false,
            fetchQuotes: () => unconfigured('fx', 'FX provider credentials'),
        },
        scanner: {
            configured: false,
            scan: () => unconfigured('scanner', 'media scanner endpoint'),
        },
        keyProvider: {
            getActiveKey: () => unconfigured('encryption', 'TRUSTVEXA_MASTER_KEK'),
            getKeyByVersion: () => unconfigured('encryption', 'TRUSTVEXA_MASTER_KEK'),
        },
    };
}
//# sourceMappingURL=adapters.js.map