import { parseEmailJob } from '../payloads.js';
import * as templates from '../email-templates/index.js';
export async function processEmail(job, ctx) {
    const message = parseEmailJob(job.data);
    let subject = message.subject || '';
    let html = message.html || '';
    if (message.templateName) {
        const data = message.templateData ?? {};
        // Template data is validated at enqueue time; the queue message guarantees
        // the correct shape per templateName. Casts below bridge from the generic
        // queue payload type to the specific template parameter type.
        switch (message.templateName) {
            case 'welcome':
                subject = 'Welcome to TrustVexa!';
                html = templates.getWelcomeEmail(data);
                break;
            case 'verify-email':
                subject = 'Verify Your Email Address';
                html = templates.getVerifyEmail(data);
                break;
            case 'password-reset':
                subject = 'Reset Your Password';
                html = templates.getPasswordResetEmail(data);
                break;
            case 'new-device-login':
                subject = 'Security Alert: New Login';
                html = templates.getNewDeviceLoginEmail(data);
                break;
            case 'deal-funded':
                subject = 'Deal Funded';
                html = templates.getDealFundedEmail(data);
                break;
            case 'payout-sent':
                subject = 'Payout Transferred';
                html = templates.getPayoutSentEmail(data);
                break;
            case 'sla-warning':
                subject = 'Urgent: SLA Warning';
                html = templates.getSlaWarningEmail(data);
                break;
            case 'dispute-opened':
                subject = 'Dispute Opened';
                html = templates.getDisputeOpenedEmail(data);
                break;
            default:
                throw new Error(`Unknown email template: ${message.templateName}`);
        }
    }
    ctx.logger.info({ to_domain: message.to.split('@')[1] ?? 'unknown', subject }, 'dispatching email');
    await ctx.adapters.mailer.send({
        to: message.to,
        subject,
        html,
        text: message.text,
    });
}
//# sourceMappingURL=email.js.map